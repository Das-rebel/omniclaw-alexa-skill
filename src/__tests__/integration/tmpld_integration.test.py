"""
Integration Tests for TMLPD v2.0

Tests all phases working together:
- Phase 1: Agent Skills
- Phase 2: Routing Workflow
- Phase 3: Simple Memory
- Phase 4: Enhanced Checkpointing
- Phase 5: Orchestrator-Workers
"""

import pytest
import asyncio
from pathlib import Path
import tempfile
import shutil
import json

from src.skills.skill_manager import SkillManager
from src.agents.skill_enhanced_agent import TMLEnhancedAgent
from src.workflows.router import TaskRouter
from src.memory.simple_memory import SimpleProjectMemory
from src.state.simple_checkpoint import SimpleCheckpoint
from src.workflows.orchestrator import OrchestratorWorkflow


@pytest.fixture
def temp_dir():
    """Create temporary directory for tests"""
    temp = Path(tempfile.mkdtemp())
    yield temp
    shutil.rmtree(temp)


@pytest.fixture
def test_skills_dir(temp_dir):
    """Create test skills directory"""
    skills_dir = temp_dir / "skills"
    skills_dir.mkdir()

    # Create test skill
    frontend_skill = skills_dir / "frontend"
    frontend_skill.mkdir()
    (frontend_skill / "SKILL.md").write_text("""---
name: "React Frontend"
description: "Best practices for React components with TypeScript and state management"
---
# React Frontend Development

This skill covers:
- TypeScript integration
- Component structure
- State management
- Testing with React Testing Library
""")

    return str(skills_dir)


class TestPhase1AgentSkills:
    """Test Phase 1: Agent Skills"""

    def test_skill_manager_initialization(self, test_skills_dir):
        """Test SkillManager initialization"""
        manager = SkillManager(test_skills_dir)

        assert len(manager.list_skills()) > 0
        assert "React Frontend" in manager.list_skills()

    def test_skill_progressive_disclosure(self, test_skills_dir):
        """Test progressive disclosure (Level 1 → Level 2)"""
        manager = SkillManager(test_skills_dir)

        # Level 1: Metadata should be loaded
        assert len(manager.skills) > 0

        # Level 2: Full content should load on demand
        skill = manager.load_skill("React Frontend")
        assert skill.content is not None
        assert "TypeScript integration" in skill.content

    def test_skill_discovery(self, test_skills_dir):
        """Test get_relevant_skills for discovery"""
        manager = SkillManager(test_skills_dir)

        relevant = manager.get_relevant_skills(
            "Build a React component with TypeScript"
        )

        assert len(relevant) > 0
        assert "React Frontend" in relevant

    def test_enhanced_agent_with_skills(self, test_skills_dir):
        """Test TMLEnhancedAgent with assigned skills"""
        agent = TMLEnhancedAgent(
            agent_id="test-agent",
            provider="anthropic",
            model="claude-sonnet-4",
            skills_dir=test_skills_dir,
            assigned_skills=["React Frontend"]
        )

        assert "React Frontend" in agent.get_assigned_skills()

        # Execute task
        task = {
            "description": "Create a React button component",
            "requirements": "Use TypeScript"
        }

        result = agent.execute_task(task)
        assert result is not None


class TestPhase2RoutingWorkflow:
    """Test Phase 2: Routing Workflow"""

    def test_router_initialization(self, test_skills_dir):
        """Test TaskRouter initialization"""
        router = TaskRouter(skills_dir=test_skills_dir)

        assert router.skill_manager is not None
        assert router.config is not None

    def test_task_classification_simple(self, test_skills_dir):
        """Test classification of simple task"""
        router = TaskRouter(skills_dir=test_skills_dir)

        task = {
            "description": "Create a React button"
        }

        classification = router.classify_task(task)

        assert classification["task_type"] in ["simple", "workflow", "agent"]
        assert 0 <= classification["complexity"] <= 1

    def test_task_classification_complex(self, test_skills_dir):
        """Test classification of complex task"""
        router = TaskRouter(skills_dir=test_skills_dir)

        task = {
            "description": "Create a full-stack application with React frontend and Node.js backend, then deploy to cloud, then set up CI/CD pipeline"
        }

        classification = router.classify_task(task)

        # Should be classified as workflow or agent due to complexity
        assert classification["task_type"] in ["workflow", "agent"]
        assert classification["complexity"] > 0.5

    def test_routing_to_skill(self, test_skills_dir):
        """Test routing to direct skill (80% case)"""
        router = TaskRouter(skills_dir=test_skills_dir)

        task = {
            "description": "Create a React button"
        }

        result = router.route(task)

        assert result["strategy"] in ["direct_skill", "workflow", "agent"]
        assert "execution_plan" in result

    def test_routing_statistics(self, test_skills_dir):
        """Test routing statistics tracking"""
        router = TaskRouter(skills_dir=test_skills_dir)

        # Route several tasks
        for i in range(5):
            router.route({"description": f"Test task {i}"})

        stats = router.get_routing_stats()
        assert stats["total_tasks"] == 5


class TestPhase3SimpleMemory:
    """Test Phase 3: Simple Memory"""

    def test_memory_initialization(self, temp_dir):
        """Test SimpleProjectMemory initialization"""
        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        assert memory_file.exists()
        assert memory.memory is not None

    def test_remember_pattern(self, temp_dir):
        """Test storing a successful pattern"""
        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        task = {"description": "Create React button"}
        result = {
            "success": True,
            "tokens_used": 100,
            "cost": 0.01,
            "execution_time": 2.5
        }

        pattern_id = memory.remember_pattern(
            task=task,
            result=result,
            agent_id="test-agent",
            skills_used=["React Frontend"]
        )

        assert pattern_id is not None
        assert len(memory.memory["patterns"]) == 1

    def test_recall_patterns(self, temp_dir):
        """Test recalling similar patterns"""
        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        # Store a pattern
        task = {"description": "Create React button component"}
        result = {"success": True, "tokens_used": 100, "cost": 0.01}

        memory.remember_pattern(
            task=task,
            result=result,
            agent_id="test-agent",
            skills_used=["React Frontend"]
        )

        # Recall similar pattern
        current_task = {"description": "Build React button with TypeScript"}
        patterns = memory.recall_patterns(current_task)

        assert len(patterns) > 0

    def test_get_best_agent(self, temp_dir):
        """Test getting best agent from memory"""
        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        # Store successful pattern
        task = {"description": "Create React component"}
        result = {"success": True}

        memory.remember_pattern(
            task=task,
            result=result,
            agent_id="frontend-agent",
            skills_used=["React Frontend"]
        )

        # Get best agent
        best = memory.get_best_agent_for_task({"description": "Build React component"})

        assert best is not None
        assert best["agent_id"] == "frontend-agent"

    def test_memory_insights(self, temp_dir):
        """Test getting memory insights"""
        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        # Store multiple patterns
        for i in range(5):
            task = {"description": f"Test task {i}"}
            result = {"success": True, "tokens_used": 100 * (i + 1)}

            memory.remember_pattern(
                task=task,
                result=result,
                agent_id="test-agent",
                skills_used=["React Frontend"]
            )

        insights = memory.get_insights()
        assert insights["total_patterns"] == 5
        assert insights["successful_patterns"] == 5


class TestPhase4Checkpointing:
    """Test Phase 4: Enhanced Checkpointing"""

    def test_checkpoint_initialization(self, temp_dir):
        """Test SimpleCheckpoint initialization"""
        checkpoint_dir = temp_dir / "checkpoints"
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        assert checkpoint_dir.exists()
        assert checkpoint.index is not None

    def test_create_checkpoint(self, temp_dir):
        """Test creating a checkpoint"""
        checkpoint_dir = temp_dir / "checkpoints"
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        state = {"current_task": "task_1", "progress": 50}

        checkpoint_id = checkpoint.create_checkpoint(
            state=state,
            name="test_checkpoint"
        )

        assert checkpoint_id is not None
        assert len(checkpoint.index["checkpoints"]) == 1

    def test_restore_checkpoint(self, temp_dir):
        """Test restoring from checkpoint"""
        checkpoint_dir = temp_dir / "checkpoints"
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        # Create checkpoint
        state = {"current_task": "task_1", "progress": 50}
        checkpoint_id = checkpoint.create_checkpoint(state=state)

        # Restore checkpoint
        restored_state = checkpoint.restore_checkpoint(checkpoint_id)

        assert restored_state == state

    def test_list_checkpoints(self, temp_dir):
        """Test listing checkpoints"""
        checkpoint_dir = temp_dir / "checkpoints"
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        # Create multiple checkpoints
        for i in range(3):
            checkpoint.create_checkpoint(
                state={"task": i},
                name=f"checkpoint_{i}"
            )

        # List checkpoints
        checkpoints = checkpoint.list_checkpoints()

        assert len(checkpoints) == 3

    def test_checkpoint_validation(self, temp_dir):
        """Test checkpoint validation"""
        checkpoint_dir = temp_dir / "checkpoints"
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        # Create checkpoint
        state = {"test": "data"}
        checkpoint.create_checkpoint(state=state)

        # Validate all
        validation = checkpoint.validate_all_checkpoints()

        assert validation["total"] == 1
        assert validation["valid"] == 1


class TestPhase5Orchestrator:
    """Test Phase 5: Orchestrator-Workers"""

    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self, test_skills_dir, temp_dir):
        """Test OrchestratorWorkflow initialization"""
        orchestrator = OrchestratorWorkflow(
            skills_dir=test_skills_dir,
            memory_file=str(temp_dir / "memory.json"),
            checkpoint_dir=str(temp_dir / "checkpoints")
        )

        assert orchestrator.skill_manager is not None
        assert orchestrator.memory is not None
        assert orchestrator.checkpoint is not None

    @pytest.mark.asyncio
    async def test_task_breakdown(self, test_skills_dir, temp_dir):
        """Test breaking down complex task"""
        orchestrator = OrchestratorWorkflow(
            skills_dir=test_skills_dir,
            memory_file=str(temp_dir / "memory.json")
        )

        task = {
            "description": "Create component then add styling then write tests"
        }

        subtasks = await orchestrator._break_down_task(task)

        assert len(subtasks) > 0
        assert "description" in subtasks[0]

    @pytest.mark.asyncio
    async def test_execute_simple_orchestration(self, test_skills_dir, temp_dir):
        """Test simple orchestration workflow"""
        orchestrator = OrchestratorWorkflow(
            skills_dir=test_skills_dir,
            memory_file=str(temp_dir / "memory.json"),
            checkpoint_dir=str(temp_dir / "checkpoints")
        )

        task = {
            "description": "Create a React button component",
            "requirements": "Use TypeScript"
        }

        result = await orchestrator.execute_task(
            task,
            enable_checkpointing=False
        )

        assert result is not None


class TestFullIntegration:
    """Test full system integration"""

    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self, test_skills_dir, temp_dir):
        """Test complete workflow: Route → Execute → Remember → Checkpoint"""

        # Setup
        router = TaskRouter(skills_dir=test_skills_dir)
        memory_file = temp_dir / "memory.json"
        checkpoint_dir = temp_dir / "checkpoints"

        memory = SimpleProjectMemory(str(memory_file))
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        # Step 1: Route task
        task = {"description": "Create React button component"}
        routing_result = router.route(task)

        assert routing_result["strategy"] in ["direct_skill", "workflow", "agent"]

        # Step 2: Execute task (if direct skill)
        if routing_result["strategy"] == "direct_skill":
            agent = routing_result["execution_plan"]["agent"]
            execution_result = agent.execute_task(task)

            # Step 3: Remember successful pattern
            if execution_result.get("success"):
                memory.remember_pattern(
                    task=task,
                    result=execution_result,
                    agent_id=agent.agent_id,
                    skills_used=agent.get_assigned_skills()
                )

            # Step 4: Create checkpoint
            checkpoint.create_checkpoint(
                state={"task": task, "result": execution_result},
                name="after_execution"
            )

            # Verify everything worked
            assert len(memory.memory["patterns"]) > 0
            assert len(checkpoint.index["checkpoints"]) > 0

    @pytest.mark.asyncio
    async def test_memory_enhanced_routing(self, test_skills_dir, temp_dir):
        """Test routing enhanced by memory"""

        # Setup
        router = TaskRouter(skills_dir=test_skills_dir)
        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        # Store a successful pattern
        task = {"description": "Create React component"}
        result = {"success": True}

        memory.remember_pattern(
            task=task,
            result=result,
            agent_id="frontend-agent",
            skills_used=["React Frontend"]
        )

        # Now route similar task
        best_agent = memory.get_best_agent_for_task(task)

        assert best_agent is not None
        assert best_agent["agent_id"] == "frontend-agent"

    @pytest.mark.asyncio
    async def test_checkpoint_recovery_workflow(self, test_skills_dir, temp_dir):
        """Test recovery from checkpoint"""

        checkpoint_dir = temp_dir / "checkpoints"
        checkpoint = SimpleCheckpoint(str(checkpoint_dir))

        # Create checkpoint with task state
        task = {"description": "Create React component", "step": 1}
        checkpoint_id = checkpoint.create_checkpoint(
            state={"current_task": task, "step": 1},
            name="work_in_progress"
        )

        # Simulate crash and recovery
        restored_state = checkpoint.restore_checkpoint(checkpoint_id)

        assert restored_state["current_task"] == task
        assert restored_state["step"] == 1


# Performance tests

class TestPerformance:
    """Test performance characteristics"""

    def test_skill_loading_performance(self, test_skills_dir):
        """Test skill loading is fast"""
        import time

        manager = SkillManager(test_skills_dir)

        start = time.time()
        manager.reload_skills()
        duration = time.time() - start

        # Should load metadata in under 1 second
        assert duration < 1.0

    def test_pattern_recall_performance(self, temp_dir):
        """Test pattern recall is fast"""
        import time

        memory_file = temp_dir / "memory.json"
        memory = SimpleProjectMemory(str(memory_file))

        # Store many patterns
        for i in range(100):
            task = {"description": f"Test task {i}"}
            result = {"success": True}

            memory.remember_pattern(
                task=task,
                result=result,
                agent_id="test-agent",
                skills_used=["Test Skill"]
            )

        # Test recall speed
        start = time.time()
        patterns = memory.recall_patterns({"description": "Test task 50"})
        duration = time.time() - start

        # Should recall in under 0.5 seconds even with 100 patterns
        assert duration < 0.5
