#!/usr/bin/env python3
"""
BSM CoreHub Nexus Comprehensive Verification & Auto-Setup Agent
Checks: DNS, Cloudflare Pages, Repository, GitHub Verification
Creates: TXT record for GitHub verification automatically via Cloudflare API
"""
import os
import sys
import time
import socket
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: 'requests' package is required. Install with: pip install requests")
    sys.exit(1)


class CoreHubVerificationAgent:
    def __init__(self):
        self.domain = "corehub.nexus"
        self.pages_domain = "bsm-8p4.pages.dev"
        self.github_challenge = "213371599508681fa9e1d85a194aab"
        self.challenge_host = "_github-pages-challenge-LexBANK"
        self.zone_id = os.getenv("CF_ZONE_ID")
        self.api_token = os.getenv("CF_API_TOKEN")
        self.project_root = os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
        self.log_file = os.path.join(self.project_root, "logs", "verify-corehub.log")

    def log(self, message, level="INFO"):
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] {level}: {message}"
        print(log_entry)
        log_dir = os.path.dirname(self.log_file)
        os.makedirs(log_dir, exist_ok=True)
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(log_entry + "\n")

    # ── Phase 1: Auto-Setup ─────────────────────────────────────────────

    def has_credentials(self):
        """Check whether Cloudflare API credentials are available."""
        if not self.api_token or not self.zone_id:
            self.log(
                "Cloudflare credentials not set (CF_API_TOKEN / CF_ZONE_ID) "
                "- skipping auto-setup",
                "WARNING",
            )
            return False
        return True

    def create_txt_record(self):
        """Create the GitHub Pages TXT verification record via Cloudflare API."""
        self.log("=== Auto-Setup: GitHub TXT Record ===", "START")

        if not self.has_credentials():
            return False

        api_url = (
            f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}/dns_records"
        )
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

        full_name = f"{self.challenge_host}.{self.domain}"

        # Check if the record already exists with the correct value
        try:
            resp = requests.get(
                api_url,
                headers=headers,
                params={"name": full_name, "type": "TXT"},
                timeout=10,
            )
            if resp.status_code == 200:
                for record in resp.json().get("result", []):
                    if self.github_challenge in record.get("content", ""):
                        self.log("TXT record already exists with correct value", "SUCCESS")
                        return True
                    # Remove stale record before creating a new one
                    del_url = f"{api_url}/{record['id']}"
                    requests.delete(del_url, headers=headers, timeout=10)
                    self.log("Deleted stale TXT record", "INFO")
        except Exception as e:
            self.log(f"Could not check existing records: {e}", "WARNING")

        # Create the record
        data = {
            "type": "TXT",
            "name": full_name,
            "content": self.github_challenge,
            "ttl": 3600,
            "comment": "GitHub Pages Verification for BSM",
        }

        try:
            resp = requests.post(api_url, headers=headers, json=data, timeout=10)
            result = resp.json()
            if resp.status_code == 200 and result.get("success"):
                self.log(f"TXT record created: {full_name}", "SUCCESS")
                return True
            errors = result.get("errors", [])
            self.log(f"Failed to create TXT record: {errors}", "ERROR")
            return False
        except Exception as e:
            self.log(f"Cloudflare API error: {e}", "ERROR")
            return False

    def ensure_cname_file(self):
        """Ensure docs/CNAME exists with the correct domain."""
        self.log("=== Auto-Setup: Repository CNAME ===", "START")
        cname_path = os.path.join(self.project_root, "docs", "CNAME")

        if os.path.exists(cname_path):
            with open(cname_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if content == self.domain:
                self.log(f"CNAME file correct: {content}", "SUCCESS")
                return True
            self.log(f"CNAME file has '{content}', fixing to '{self.domain}'", "INFO")

        os.makedirs(os.path.dirname(cname_path), exist_ok=True)
        with open(cname_path, "w", encoding="utf-8") as f:
            f.write(self.domain + "\n")
        self.log(f"CNAME file written: {self.domain}", "SUCCESS")
        return True

    # ── Phase 2: Verification ───────────────────────────────────────────

    def check_dns_resolution(self):
        """Does the domain resolve?"""
        self.log("=== Check: DNS Resolution ===", "START")
        try:
            result = socket.gethostbyname(self.domain)
            self.log(f"Resolves to: {result}", "SUCCESS")
            return True
        except socket.gaierror:
            self.log("Domain does not resolve yet", "ERROR")
            return False

    def check_cloudflare_pages(self):
        """Does the domain point to Cloudflare Pages and serve HTTPS?"""
        self.log("=== Check: Cloudflare Pages ===", "START")
        try:
            result = socket.gethostbyname(self.domain)
            if not result.startswith(("104.", "172.", "173.")):
                self.log(f"Not a Cloudflare IP: {result}", "WARNING")
                return False

            self.log(f"Resolves to Cloudflare IP: {result}", "SUCCESS")

            response = requests.get(
                f"https://{self.domain}",
                timeout=10,
                allow_redirects=True,
                headers={"User-Agent": "BSM-Verification-Agent"},
            )

            if response.status_code == 200:
                self.log(
                    f"HTTPS working (Status: {response.status_code})", "SUCCESS"
                )
                return True
            if "Error 1014" in response.text:
                self.log("Error 1014: Cross-User CNAME issue", "ERROR")
                self.log(
                    "  Solution: Remove manual CNAME, add via Pages Dashboard", "INFO"
                )
                return False
            self.log(f"HTTP Status: {response.status_code}", "WARNING")
            return False
        except Exception as e:
            self.log(f"Connection failed: {e}", "ERROR")
            return False

    def check_txt_record(self):
        """Is the GitHub Pages TXT verification record resolvable?"""
        self.log("=== Check: GitHub TXT Record ===", "START")
        full_name = f"{self.challenge_host}.{self.domain}"
        try:
            import dns.resolver

            answers = dns.resolver.resolve(full_name, "TXT")
            for rdata in answers:
                if self.github_challenge in str(rdata):
                    self.log("GitHub TXT record found", "SUCCESS")
                    return True
            self.log("TXT record exists but value does not match", "ERROR")
            return False
        except ImportError:
            self.log(
                "dnspython not installed - skipping DNS-level TXT check "
                "(install with: pip install dnspython)",
                "WARNING",
            )
            self.log(f"  Required: {full_name} = {self.github_challenge}", "INFO")
            return False
        except Exception as e:
            self.log(f"Cannot verify TXT record: {e}", "ERROR")
            self.log(f"  Required: {full_name} = {self.github_challenge}", "INFO")
            return False

    def check_cloudflare_headers(self):
        """Are Cloudflare headers present on the domain?"""
        self.log("=== Check: Cloudflare Headers ===", "START")
        try:
            response = requests.head(f"https://{self.domain}", timeout=5)
            if "cf-ray" in response.headers:
                self.log("Cloudflare headers detected (cf-ray)", "SUCCESS")
                return True
            self.log("No Cloudflare headers detected", "WARNING")
            self.log(
                "  Verify domain is added in Cloudflare Pages dashboard", "INFO"
            )
            return False
        except Exception as e:
            self.log(f"Cannot reach domain: {e}", "ERROR")
            self.log(
                "  Verify domain is added in Cloudflare Pages dashboard", "INFO"
            )
            return False

    # ── Main runner ─────────────────────────────────────────────────────

    def run_all_checks(self):
        """Run auto-setup then verify all checks."""
        self.log("CoreHub Nexus Verification Started", "START")
        self.log(f"Domain: {self.domain}", "INFO")
        self.log(f"Target: {self.pages_domain}", "INFO")

        # Phase 1: Auto-Setup
        self.log("=" * 50, "INFO")
        self.log("PHASE 1: AUTO-SETUP", "START")

        self.ensure_cname_file()

        if self.has_credentials():
            if not self.check_txt_record():
                self.create_txt_record()
                self.log("Waiting for DNS propagation...", "INFO")
                time.sleep(3)

        # Phase 2: Verification
        self.log("=" * 50, "INFO")
        self.log("PHASE 2: VERIFICATION", "START")

        checks = [
            ("DNS Resolution", self.check_dns_resolution),
            ("Cloudflare Pages", self.check_cloudflare_pages),
            ("GitHub TXT Record", self.check_txt_record),
            ("Cloudflare Headers", self.check_cloudflare_headers),
        ]

        results = {}
        all_passed = True

        for name, check_func in checks:
            try:
                result = check_func()
                results[name] = result
                if not result:
                    all_passed = False
                time.sleep(1)
            except Exception as e:
                self.log(f"Exception in {name}: {e}", "ERROR")
                results[name] = False
                all_passed = False

        # Summary
        self.log("=" * 50, "INFO")
        self.log("VERIFICATION SUMMARY", "START")

        for name, result in results.items():
            status = "PASS" if result else "FAIL"
            self.log(f"{status}: {name}", "SUCCESS" if result else "ERROR")

        if all_passed:
            self.log("=" * 50, "INFO")
            self.log("ALL CHECKS PASSED!", "SUCCESS")
            self.log(f"{self.domain} is fully configured!", "SUCCESS")
            self.log(
                f"Site accessible at https://{self.domain}", "SUCCESS"
            )
            return 0

        self.log("=" * 50, "INFO")
        self.log("VERIFICATION INCOMPLETE", "ERROR")
        self.log("Fix the errors above and run again.", "ERROR")
        return 1


if __name__ == "__main__":
    agent = CoreHubVerificationAgent()
    sys.exit(agent.run_all_checks())
