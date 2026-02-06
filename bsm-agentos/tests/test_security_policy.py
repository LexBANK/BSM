from bsm_agentos.security.policy import SecurityPolicy


def test_scan_code_for_risks_detects_forbidden_calls() -> None:
    policy = SecurityPolicy()
    sample = """
import os

def run():
    eval('1+1')
    os.system('echo bad')
"""
    risks = policy.scan_code_for_risks(sample)
    assert "Forbidden function: eval" in risks
    assert "Forbidden call: os.system" in risks


def test_enforce_permissions_rejects_write_scope() -> None:
    policy = SecurityPolicy()
    agent = {"permissions": {"contents": "write"}}
    try:
        policy.enforce_permissions(agent)
    except PermissionError:
        assert True
    else:
        assert False, "Expected PermissionError"
