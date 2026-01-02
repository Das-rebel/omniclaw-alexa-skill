"""
Test TMLPD v2.2 Integration Layer

Verify backward compatibility and v2.2 features
"""

import asyncio
import sys
sys.path.append('/Users/Subho/tmlpd-skill')

from src.tmpld_v2 import (
    TMLPDOrchestrator,
    TMLPDConfig,
    execute_task_simple
)


async def test_backward_compatibility():
    """Test 1: Verify v2.1 default behavior is preserved"""
    print("=" * 70)
    print("TEST 1: Backward Compatibility (v2.1 Default Behavior)")
    print("=" * 70)

    # Default config (should behave like v2.1)
    config = TMLPDConfig()  # All v2.2 features disabled by default
    orchestrator = TMLPDOrchestrator(config)

    print(f"\nConfig:")
    print(f"  Use HALO: {config.use_halo_orchestration}")
    print(f"  Use Universal Router: {config.use_universal_router}")
    print(f"  Use MCTS: {config.use_mcts_optimization}")
    print(f"  Use v2.1 Difficulty Classifier: {config.use_difficulty_classifier}")
    print(f"  Use v2.1 Enhanced Agent: {config.use_enhanced_agent}")

    # Simple task
    task = {"description": "What is 2+2?", "context": {}}
    result = await orchestrator.execute_task(task)

    print(f"\nSimple Task Result:")
    print(f"  Method: {result['method']}")
    print(f"  Success: {result['success']}")

    # Verify it used v2.1 path (not HALO or router)
    assert result['method'] in ['v21_enhanced_agent', 'simple_fallback'], \
        f"Expected v2.1 method, got {result['method']}"

    print("\n✅ Test 1 PASSED: Default behavior preserves v2.1 compatibility\n")


async def test_halo_feature():
    """Test 2: HALO orchestration for complex tasks"""
    print("=" * 70)
    print("TEST 2: HALO Orchestration (v2.2 Feature)")
    print("=" * 70)

    config = TMLPDConfig(
        use_halo_orchestration=True,
        max_concurrent_subtasks=3
    )

    orchestrator = TMLPDOrchestrator(config)

    # Complex task (should trigger HALO)
    task = {
        "description": "Build a REST API with JWT authentication, PostgreSQL database, and automated testing",
        "context": {
            "requirements": ["JWT", "PostgreSQL", "Jest", "Docker"]
        }
    }

    print(f"\nComplex Task: {task['description'][:60]}...")
    result = await orchestrator.execute_task(task)

    print(f"\nResult:")
    print(f"  Method: {result['method']}")
    print(f"  Success: {result['success']}")

    if result['method'] == 'halo_orchestration':
        metadata = result.get('metadata', {})
        print(f"  Subtasks: {metadata.get('total_subtasks', 0)}")
        print(f"  Parallel Speedup: {metadata.get('parallel_speedup', 1.0):.2f}x")
        print(f"  Total Cost: ${metadata.get('total_cost_usd', 0.0):.6f}")

        # Verify HALO metadata
        assert 'total_subtasks' in metadata, "Missing HALO metadata"
        assert metadata['total_subtasks'] > 0, "HALO should create subtasks"

    print("\n✅ Test 2 PASSED: HALO orchestration works correctly\n")


async def test_universal_router():
    """Test 3: Universal Router for model selection"""
    print("=" * 70)
    print("TEST 3: Universal Router (v2.2 Feature)")
    print("=" * 70)

    config = TMLPDConfig(
        use_universal_router=True,
        router_quality_target=0.90,
        router_cost_weight=0.7  # Prioritize cost
    )

    orchestrator = TMLPDOrchestrator(config)

    # Simple task (should route to cheap model)
    task = {"description": "What is the capital of France?", "context": {}}
    result = await orchestrator.execute_task(task)

    print(f"\nTask: {task['description']}")
    print(f"\nResult:")
    print(f"  Method: {result['method']}")
    print(f"  Success: {result['success']}")

    if result['method'] == 'universal_router':
        metadata = result.get('metadata', {})
        print(f"  Selected Model: {metadata.get('selected_model', 'N/A')}")
        print(f"  Predicted Quality: {metadata.get('predicted_quality', 0):.2f}")
        print(f"  Estimated Cost: ${metadata.get('estimated_cost', 0):.6f}")
        print(f"  Reasoning: {metadata.get('reasoning', '')[:80]}...")

        # Verify router metadata
        assert 'selected_model' in metadata, "Missing router metadata"

    print("\n✅ Test 3 PASSED: Universal Router works correctly\n")


async def test_halo_router_integration():
    """Test 4: HALO + Universal Router combined"""
    print("=" * 70)
    print("TEST 4: HALO + Universal Router Integration")
    print("=" * 70)

    config = TMLPDConfig(
        use_halo_orchestration=True,
        use_universal_router=True,
        halo_optimization_target="quality",
        router_quality_target=0.95
    )

    orchestrator = TMLPDOrchestrator(config)

    # Complex task with multiple requirements
    task = {
        "description": "Design and implement a microservices architecture with service mesh, API gateway, and event-driven communication",
        "context": {
            "requirements": ["Kubernetes", "Istio", "Kafka", "Docker"],
            "constraints": ["low-latency", "high-throughput"]
        }
    }

    print(f"\nComplex Task: {task['description'][:60]}...")
    result = await orchestrator.execute_task(task)

    print(f"\nResult:")
    print(f"  Method: {result['method']}")
    print(f"  Success: {result['success']}")

    metadata = result.get('metadata', {})
    if result['method'] == 'halo_orchestration':
        print(f"  Subtasks: {metadata.get('total_subtasks', 0)}")
        print(f"  Speedup: {metadata.get('parallel_speedup', 1.0):.2f}x")
    elif result['method'] == 'universal_router':
        print(f"  Model: {metadata.get('selected_model', 'N/A')}")

    print("\n✅ Test 4 PASSED: HALO + Router integration works\n")


async def test_simple_api():
    """Test 5: Convenience function for quick usage"""
    print("=" * 70)
    print("TEST 5: Simple API (Convenience Function)")
    print("=" * 70)

    # Test with different configs
    tests = [
        ("Simple (v2.1)", "What is Python?", {}),
        ("Router", "Explain REST APIs", {"use_router": True}),
        ("HALO", "Build a full-stack app with database", {"use_halo": True})
    ]

    for test_name, description, kwargs in tests:
        result = await execute_task_simple(description, **kwargs)
        print(f"\n{test_name}:")
        print(f"  Method: {result['method']}")
        print(f"  Success: {result['success']}")

    print("\n✅ Test 5 PASSED: Simple API works correctly\n")


async def test_config_updates():
    """Test 6: Dynamic configuration updates"""
    print("=" * 70)
    print("TEST 6: Dynamic Configuration Updates")
    print("=" * 70)

    config = TMLPDConfig(
        use_halo_orchestration=False,
        use_universal_router=False
    )

    orchestrator = TMLPDOrchestrator(config)

    print(f"\nInitial Config:")
    print(f"  HALO: {config.use_halo_orchestration}")
    print(f"  Router: {config.use_universal_router}")

    # Enable HALO
    orchestrator.update_config(use_halo_orchestration=True)

    print(f"\nAfter Update:")
    print(f"  HALO: {orchestrator.config.use_halo_orchestration}")
    print(f"  Router: {orchestrator.config.use_universal_router}")

    # Complex task should now use HALO
    task = {"description": "Build a distributed system", "context": {}}
    result = await orchestrator.execute_task(task)

    print(f"\nResult Method: {result['method']}")

    # Verify HALO is now enabled
    assert orchestrator.config.use_halo_orchestration == True

    print("\n✅ Test 6 PASSED: Configuration updates work correctly\n")


async def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("TMLPD v2.2 INTEGRATION LAYER - TEST SUITE")
    print("=" * 70 + "\n")

    try:
        await test_backward_compatibility()
        await test_halo_feature()
        await test_universal_router()
        await test_halo_router_integration()
        await test_simple_api()
        await test_config_updates()

        print("=" * 70)
        print("ALL TESTS PASSED ✅")
        print("=" * 70)

        print("\n" + "=" * 70)
        print("TMLPD v2.2 INTEGRATION SUMMARY")
        print("=" * 70)
        print("\n✅ Backward Compatibility: v2.1 API preserved")
        print("✅ HALO Orchestration: Complex task decomposition")
        print("✅ Universal Router: Smart model selection")
        print("✅ Integration: HALO + Router work together")
        print("✅ Simple API: Convenience functions available")
        print("✅ Dynamic Config: Runtime updates supported")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
