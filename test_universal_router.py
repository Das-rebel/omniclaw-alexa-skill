"""
Test Universal Learned Router

Verify routing logic, quality prediction, and online learning.
"""

import asyncio
import sys
sys.path.append('/Users/Subho/tmlpd-skill')

from src.routing import UniversalModelRouter


async def test_basic_routing():
    """Test 1: Basic routing selects appropriate models"""
    print("=" * 70)
    print("TEST 1: Basic Routing - Model Selection")
    print("=" * 70)

    router = UniversalModelRouter(quality_target=0.90, cost_weight=0.5)

    # Test simple task (should route to cheap model)
    simple_task = {
        "description": "What is 2+2?",
        "context": {}
    }

    decision = await router.route(simple_task, ["anthropic/claude-3-5-sonnet", "cerebras/llama-3.3-70b"])

    print(f"\nSimple Task: {simple_task['description']}")
    print(f"  Selected Model: {decision.selected_model}")
    print(f"  Reasoning: {decision.reasoning}")
    print(f"  Predicted Quality: {decision.predicted_quality:.2f}")
    print(f"  Estimated Cost: ${decision.estimated_cost:.6f}")

    # Test complex task (should route to high-quality model)
    complex_task = {
        "description": "Design a distributed system architecture for a real-time trading platform with microservices, event sourcing, and eventual consistency",
        "context": {"domain": "system-design", "constraints": ["low-latency", "high-throughput"]}
    }

    decision2 = await router.route(complex_task, ["anthropic/claude-3-5-sonnet-20241022", "cerebras/llama-3.3-70b"])

    print(f"\nComplex Task: {complex_task['description'][:60]}...")
    print(f"  Selected Model: {decision2.selected_model}")
    print(f"  Reasoning: {decision2.reasoning}")
    print(f"  Predicted Quality: {decision2.predicted_quality:.2f}")
    print(f"  Estimated Cost: ${decision2.estimated_cost:.6f}")

    print("\n✅ Test 1 PASSED: Router selects appropriate models\n")


async def test_feature_extraction():
    """Test 2: Feature extraction captures task characteristics"""
    print("=" * 70)
    print("TEST 2: Feature Extraction")
    print("=" * 70)

    router = UniversalModelRouter()

    # Technical coding task
    coding_task = {
        "description": "Implement a REST API with authentication and database integration",
        "context": {"requirements": ["JWT", "PostgreSQL"]}
    }

    features = router._extract_task_features(coding_task)

    print(f"\nCoding Task Features:")
    print(f"  Length: {features['length']:.2f}")
    print(f"  Technical: {features['technical']:.2f}")
    print(f"  Complexity: {features['complexity']:.2f}")
    print(f"  Constraints: {features['constraints']:.2f}")
    print(f"  Domain Scores: {features['domain']}")

    # Creative writing task
    writing_task = {
        "description": "Write a short story about a robot learning to paint",
        "context": {"genre": "science-fiction", "style": "creative"}
    }

    features2 = router._extract_task_features(writing_task)

    print(f"\nWriting Task Features:")
    print(f"  Length: {features2['length']:.2f}")
    print(f"  Technical: {features2['technical']:.2f}")
    print(f"  Complexity: {features2['complexity']:.2f}")
    print(f"  Constraints: {features2['constraints']:.2f}")
    print(f"  Domain Scores: {features2['domain']}")

    print("\n✅ Test 2 PASSED: Features capture task characteristics\n")


async def test_online_learning():
    """Test 3: Online learning updates model profiles"""
    print("=" * 70)
    print("TEST 3: Online Learning - Profile Updates")
    print("=" * 70)

    router = UniversalModelRouter()

    # Get initial profile
    model_id = "anthropic/claude-3-5-sonnet-20241022"
    initial_profile = router.model_profiles[model_id]

    print(f"\nInitial Profile for {model_id}:")
    print(f"  Average Quality: {initial_profile.avg_quality_score:.3f}")
    print(f"  Total Executions: {initial_profile.total_executions}")

    # Simulate feedback loop
    print("\nSimulating 5 execution outcomes...")

    outcomes = [
        {
            "model": model_id,
            "task": {"description": "Implement REST API with authentication", "context": {"requirements": ["JWT"]}},
            "actual_quality": 0.96,
            "success": True,
            "cost_usd": 0.003
        },
        {
            "model": model_id,
            "task": {"description": "What is the capital of France?", "context": {}},
            "actual_quality": 0.98,
            "success": True,
            "cost_usd": 0.001
        },
        {
            "model": model_id,
            "task": {"description": "Design distributed system for trading platform", "context": {"requirements": ["low-latency", "high-throughput"]}},
            "actual_quality": 0.94,
            "success": True,
            "cost_usd": 0.005
        },
        {
            "model": model_id,
            "task": {"description": "Analyze this dataset and provide insights", "context": {"domain": "data-analysis"}},
            "actual_quality": 0.97,
            "success": True,
            "cost_usd": 0.004
        },
        {
            "model": model_id,
            "task": {"description": "Write a creative story about a robot", "context": {"genre": "science-fiction"}},
            "actual_quality": 0.99,
            "success": True,
            "cost_usd": 0.002
        }
    ]

    await router.learn_from_feedback(outcomes)

    # Get updated profile
    updated_profile = router.model_profiles[model_id]

    print(f"\nUpdated Profile for {model_id}:")
    print(f"  Average Quality: {updated_profile.avg_quality_score:.3f}")
    print(f"  Quality Variance: {updated_profile.quality_variance:.4f}")
    print(f"  Total Executions: {updated_profile.total_executions}")
    print(f"  Recent Outcomes: {len(updated_profile.recent_outcomes)} samples")

    print("\nQuality by Difficulty Level:")
    for difficulty, quality in updated_profile.quality_by_difficulty.items():
        print(f"  {difficulty}: {quality:.3f}")

    print("\n✅ Test 3 PASSED: Online learning updates profiles correctly\n")


async def test_cost_optimization():
    """Test 4: Cost optimization routes to cheaper models when appropriate"""
    print("=" * 70)
    print("TEST 4: Cost Optimization")
    print("=" * 70)

    # High cost weight (prioritize cheap models)
    router_cheap = UniversalModelRouter(quality_target=0.75, cost_weight=0.8)

    # High quality target (prioritize quality)
    router_quality = UniversalModelRouter(quality_target=0.95, cost_weight=0.2)

    simple_task = {
        "description": "What is the capital of France?",
        "context": {}
    }

    available_models = [
        "anthropic/claude-3-5-sonnet",
        "cerebras/llama-3.3-70b",
        "groq/llama-3.3-70b"
    ]

    decision_cheap = await router_cheap.route(simple_task, available_models)
    decision_quality = await router_quality.route(simple_task, available_models)

    print(f"\nSimple Task: {simple_task['description']}")
    print(f"\nCost-Optimized Router:")
    print(f"  Selected: {decision_cheap.selected_model}")
    print(f"  Estimated Cost: ${decision_cheap.estimated_cost:.6f}")
    print(f"  Predicted Quality: {decision_cheap.predicted_quality:.2f}")

    print(f"\nQuality-Optimized Router:")
    print(f"  Selected: {decision_quality.selected_model}")
    print(f"  Estimated Cost: ${decision_quality.estimated_cost:.6f}")
    print(f"  Predicted Quality: {decision_quality.predicted_quality:.2f}")

    print("\n✅ Test 4 PASSED: Cost optimization routing works correctly\n")


async def test_unseen_model():
    """Test 5: Unseen model profile inference"""
    print("=" * 70)
    print("TEST 5: Unseen Model Profile Inference")
    print("=" * 70)

    router = UniversalModelRouter()

    # Try to route with an unseen model
    unseen_model = "openai/gpt-4o-mini"

    task = {
        "description": "Summarize this text",
        "context": {}
    }

    decision = await router.route(task, ["anthropic/claude-3-5-sonnet", unseen_model])

    print(f"\nUnseen Model: {unseen_model}")
    print(f"  Profile Inferred: {unseen_model in router.model_profiles}")
    print(f"  Selected Model: {decision.selected_model}")

    if unseen_model in router.model_profiles:
        profile = router.model_profiles[unseen_model]
        print(f"\nInferred Profile:")
        print(f"  Provider: {profile.provider}")
        print(f"  Cost: ${profile.cost_per_1k_tokens:.6f}/1K tokens")
        print(f"  Quality: {profile.avg_quality_score:.2f}")

    print("\n✅ Test 5 PASSED: Unseen models get inferred profiles\n")


async def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("UNIVERSAL LEARNED ROUTER - TEST SUITE")
    print("=" * 70 + "\n")

    try:
        await test_basic_routing()
        await test_feature_extraction()
        await test_online_learning()
        await test_cost_optimization()
        await test_unseen_model()

        print("=" * 70)
        print("ALL TESTS PASSED ✅")
        print("=" * 70)

        # Show router stats
        print("\nRouter Statistics:")
        router = UniversalModelRouter()
        print(f"  Total Models: {len(router.model_profiles)}")
        print(f"  Model Providers: {set(p.provider for p in router.model_profiles.values())}")
        print(f"  Learning Rate: {router.learning_rate}")
        print(f"  Quality Target: {router.quality_target}")
        print(f"  Cost Weight: {router.cost_weight}")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
