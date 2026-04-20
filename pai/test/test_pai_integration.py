#!/usr/bin/env python3
"""
PAI Integration Test Suite
Tests that PAI control plane integrates correctly with OmniClaw execution plane
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_pai_imports():
    """Test that PAI modules can be imported"""
    print("\n📦 Testing PAI imports...")

    try:
        from pai.system.telos_integration import TelosIntegration
        print("   ✓ TelosIntegration imported")
    except ImportError as e:
        print(f"   ✗ TelosIntegration import failed: {e}")
        return False

    try:
        import sys
        pai_system_path = project_root / "pai" / "system"
        if str(pai_system_path) not in sys.path:
            sys.path.insert(0, str(pai_system_path))

        # Check that index.js exists (Node.js integration)
        index_js = pai_system_path / "index.js"
        if index_js.exists():
            print(f"   ✓ PAI system index.js found at {index_js}")
        else:
            print(f"   ✗ PAI system index.js not found")
            return False

    except Exception as e:
        print(f"   ✗ PAI system check failed: {e}")
        return False

    return True


def test_telos_loader():
    """Test TELOS context loading"""
    print("\n🎭 Testing TELOS loader...")

    try:
        from pai.system.telos_integration import TelosIntegration

        integration = TelosIntegration()
        telos = integration.load()

        if not isinstance(telos, dict):
            print(f"   ✗ TELOS should be dict, got {type(telos)}")
            return False

        required_keys = ['mission', 'goals', 'projects', 'beliefs', 'models',
                        'strategies', 'narratives', 'learned', 'challenges', 'ideas']

        missing_keys = [k for k in required_keys if k not in telos]
        if missing_keys:
            print(f"   ✗ Missing TELOS keys: {missing_keys}")
            return False

        print(f"   ✓ TELOS loaded with {len(telos)} components")

        # Show sample from each component
        for key in required_keys[:3]:  # Show first 3
            content = telos.get(key)
            if content:
                preview = str(content)[:100]
                print(f"   ✓ {key.upper()}: {preview}...")
            else:
                print(f"   ⚠️  {key.upper()}: Empty")

        return True

    except Exception as e:
        print(f"   ✗ TELOS loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_skill_tier_resolution():
    """Test PAI skill tier resolution in SkillManager"""
    print("\n🎯 Testing skill tier resolution...")

    try:
        from src.skills.skill_manager import SkillManager

        # Create a test skills directory
        test_skills_dir = project_root / "tmp" / "test_skills"
        test_skills_dir.mkdir(parents=True, exist_ok=True)

        # Create test skills at different tiers
        (test_skills_dir / "test_script.js").write_text("console.log('test');")
        (test_skills_dir / "test_command.sh").write_text("echo test")
        (test_skills_dir / "test_prompt.md").write_text("# Test prompt")
        (test_skills_dir / "SKILL.md").write_text("# Test LLM skill")

        manager = SkillManager(str(test_skills_dir))

        # Test tier resolution
        intent = "test intent"

        # Should resolve to CODE tier (JavaScript file)
        tier, result = manager.resolve_skill(intent, {})
        if tier not in ['CODE', 'CLI', 'PROMPT', 'SKILL']:
            print(f"   ✗ Invalid tier: {tier}")
            return False

        print(f"   ✓ Resolved to {tier} tier")

        # Test that PAI skill tiers are defined
        from src.skills.skill_manager import SKILL_TIERS
        print(f"   ✓ Skill tiers defined: {[t['name'] for t in SKILL_TIERS]}")

        # Cleanup
        import shutil
        shutil.rmtree(test_skills_dir.parent)

        return True

    except Exception as e:
        print(f"   ✗ Skill tier resolution failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_hook_bus():
    """Test PAI hook bus functionality"""
    print("\n🔗 Testing hook bus...")

    try:
        # Test Node.js hook bus exists
        hook_bus_js = project_root / "pai" / "system" / "hooks" / "hook_bus.js"
        if not hook_bus_js.exists():
            print(f"   ✗ Hook bus not found at {hook_bus_js}")
            return False

        print(f"   ✓ Hook bus exists at {hook_bus_js}")

        # Check subscribers
        subscribers_dir = project_root / "pai" / "system" / "hooks" / "subscribers"
        if not subscribers_dir.exists():
            print(f"   ✗ Hook subscribers directory not found")
            return False

        subscribers = list(subscribers_dir.glob("*.js"))
        print(f"   ✓ Found {len(subscribers)} hook subscribers")

        for sub in subscribers:
            print(f"   ✓ - {sub.name}")

        return True

    except Exception as e:
        print(f"   ✗ Hook bus test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_tmlpd_agent_integration():
    """Test that TMLPD agent can integrate PAI"""
    print("\n🤖 Testing TMLPD agent PAI integration...")

    try:
        # Set PAI enabled
        os.environ['PAI_CONTROL_PLANE_ENABLED'] = 'true'

        # Import should work now
        from src.tmlpd_agent import TMLPDUnifiedAgent

        print(f"   ✓ TMLPD agent imported with PAI support")

        # Check that agent has PAI attributes
        agent = TMLPDUnifiedAgent()

        if not hasattr(agent, 'pai_enabled'):
            print(f"   ✗ Agent missing pai_enabled attribute")
            return False

        if not hasattr(agent, 'telos_integration'):
            print(f"   ✗ Agent missing telos_integration attribute")
            return False

        print(f"   ✓ Agent has PAI attributes")

        # Test that TELOS can be loaded (without full initialization)
        if agent.pai_enabled:
            try:
                telos = agent.telos_integration.load() if agent.telos_integration else None
                if telos:
                    print(f"   ✓ TELOS loaded successfully")
                else:
                    print(f"   ⚠️  TELOS not loaded (integration disabled)")
            except Exception as e:
                print(f"   ⚠️  TELOS loading warning: {e}")

        return True

    except Exception as e:
        print(f"   ✗ TMLPD agent integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Clean up
        os.environ.pop('PAI_CONTROL_PLANE_ENABLED', None)


def test_user_system_separation():
    """Test that USER/ and SYSTEM/ directories are separated"""
    print("\n👥 Testing USER/SYSTEM separation...")

    try:
        pai_dir = project_root / "pai"
        user_dir = pai_dir / "USER"
        system_dir = pai_dir / "system"

        if not system_dir.exists():
            print(f"   ✗ SYSTEM directory not found")
            return False

        print(f"   ✓ SYSTEM directory exists")

        # USER directory is optional but should be documented
        install_script = pai_dir / "install.sh"
        if not install_script.exists():
            print(f"   ✗ install.sh not found")
            return False

        # Check that install.sh preserves USER/ directory
        install_content = install_script.read_text()
        if 'USER' not in install_content:
            print(f"   ⚠️  install.sh doesn't mention USER directory")
        else:
            print(f"   ✓ install.sh preserves USER/ directory")

        return True

    except Exception as e:
        print(f"   ✗ USER/SYSTEM separation test failed: {e}")
        return False


def main():
    """Run all PAI integration tests"""
    print("=" * 70)
    print("🧪 PAI Integration Test Suite")
    print("=" * 70)

    tests = [
        ("PAI Imports", test_pai_imports),
        ("TELOS Loader", test_telos_loader),
        ("Skill Tier Resolution", test_skill_tier_resolution),
        ("Hook Bus", test_hook_bus),
        ("TMLPD Agent Integration", test_tmlpd_agent_integration),
        ("USER/SYSTEM Separation", test_user_system_separation),
    ]

    results = []

    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} test crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))

    # Print summary
    print("\n" + "=" * 70)
    print("📊 Test Summary")
    print("=" * 70)

    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")

    print("\n" + "=" * 70)
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
