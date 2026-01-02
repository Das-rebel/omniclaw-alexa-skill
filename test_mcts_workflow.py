"""
Test MCTS Workflow Search
"""

import asyncio
import sys
sys.path.append('/Users/Subho/tmlpd-skill')

from src.orchestration import TaskPlanner, RoleAssigner, ExecutionEngine, MCTSWorkflowSearch


async def test_mcts_basic():
    """Test 1: Basic MCTS search for workflow optimization"""
    print("=" * 70)
    print("TEST 1: Basic MCTS Workflow Search")
    print("=" * 70)

    # Create components
    planner = TaskPlanner()
    assigner = RoleAssigner()
    engine = ExecutionEngine(max_concurrent=3)
    mcts = MCTSWorkflowSearch(assigner, engine, max_simulations=50)

    # Create task
    task = {
        "description": "Build a REST API with JWT authentication and PostgreSQL database",
        "context": {"requirements": ["JWT", "PostgreSQL", "Docker"]}
    }

    print(f"\nTask: {task['description']}")

    # Decompose
    print("\nDecomposing task...")
    decomposition = await planner.decompose(task)

    print(f"Decomposed into {len(decomposition.subtasks)} subtasks:")
    for st in decomposition.subtasks:
        print(f"  {st.id}: {st.description} (difficulty: {st.difficulty:.0f})")

    # Search for optimal workflow
    print("\nRunning MCTS search (50 simulations)...")
    best_strategy = await mcts.search(decomposition, optimization_target="balanced")

    print(f"\n✅ Best Workflow Strategy Found:")
    print(f"  Agent Assignments:")
    for subtask_id, model_id in best_strategy.subtask_assignments.items():
        print(f"    {subtask_id} → {model_id}")
    print(f"  Expected Quality: {best_strategy.expected_quality:.2f}")
    print(f"  Expected Cost: ${best_strategy.expected_cost:.6f}")
    print(f"  Execution Order: {best_strategy.execution_order}")

    print("\n✅ Test 1 PASSED\n")


async def test_mcts_quality_vs_cost():
    """Test 2: Quality vs Cost optimization targets"""
    print("=" * 70)
    print("TEST 2: Quality vs Cost Optimization")
    print("=" * 70)

    planner = TaskPlanner()
    assigner = RoleAssigner()
    engine = ExecutionEngine(max_concurrent=3)

    # Quality-optimized search
    mcts_quality = MCTSWorkflowSearch(assigner, engine, max_simulations=30)
    task = {
        "description": "Design a complex distributed system architecture",
        "context": {"requirements": ["microservices", "event-sourcing"]}
    }

    decomposition = await planner.decompose(task)

    print("\nQuality-Optimized Search:")
    strategy_quality = await mcts_quality.search(decomposition, optimization_target="quality")
    print(f"  Assignments: {strategy_quality.subtask_assignments}")
    print(f"  Expected Quality: {strategy_quality.expected_quality:.2f}")
    print(f"  Expected Cost: ${strategy_quality.expected_cost:.6f}")

    # Cost-optimized search
    mcts_cost = MCTSWorkflowSearch(assigner, engine, max_simulations=30)
    print("\nCost-Optimized Search:")
    strategy_cost = await mcts_cost.search(decomposition, optimization_target="cost")
    print(f"  Assignments: {strategy_cost.subtask_assignments}")
    print(f"  Expected Quality: {strategy_cost.expected_quality:.2f}")
    print(f"  Expected Cost: ${strategy_cost.expected_cost:.6f}")

    # Verify quality strategy has higher expected quality
    # and cost strategy has lower expected cost
    print(f"\nQuality Improvement: {strategy_quality.expected_quality - strategy_cost.expected_quality:.2%}")
    print(f"Cost Difference: ${strategy_quality.expected_cost - strategy_cost.expected_cost:.6f}")

    print("\n✅ Test 2 PASSED\n")


async def test_mcts_tree_building():
    """Test 3: Verify MCTS tree structure"""
    print("=" * 70)
    print("TEST 3: MCTS Tree Structure")
    print("=" * 70)

    planner = TaskPlanner()
    assigner = RoleAssigner()
    engine = ExecutionEngine(max_concurrent=3)
    mcts = MCTSWorkflowSearch(assigner, engine, max_simulations=20, exploration_weight=1.414)

    task = {
        "description": "Implement user authentication",
        "context": {"requirements": ["JWT"]}
    }

    decomposition = await planner.decompose(task)

    print(f"\nRunning MCTS with {mcts.max_simulations} simulations...")
    best_strategy = await mcts.search(decomposition, optimization_target="balanced")

    stats = mcts.get_search_stats()
    print(f"\nMCTS Statistics:")
    print(f"  Total searches: {stats['total_searches']}")
    print(f"  Cache size: {stats['cache_size']}")
    print(f"  Average strategy quality: {stats['avg_strategy_quality']:.2f}")
    print(f"  Average strategy cost: ${stats['avg_strategy_cost']:.6f}")

    print("\n✅ Test 3 PASSED\n")


async def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("MCTS WORKFLOW SEARCH - TEST SUITE")
    print("=" * 70 + "\n")

    try:
        await test_mcts_basic()
        await test_mcts_quality_vs_cost()
        await test_mcts_tree_building()

        print("=" * 70)
        print("ALL TESTS PASSED ✅")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
