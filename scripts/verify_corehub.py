#!/usr/bin/env python3
"""
BSM CoreHub Nexus Comprehensive Verification Agent
Checks: DNS, Cloudflare Pages, Repository, GitHub Verification
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
        self.challenge_host = "_github-pages-challenge-LexBANK.corehub.nexus"
        self.log_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "logs",
            "verify-corehub.log",
        )

    def log(self, message, level="INFO"):
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] {level}: {message}"
        print(log_entry)
        log_dir = os.path.dirname(self.log_file)
        os.makedirs(log_dir, exist_ok=True)
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(log_entry + "\n")

    def check_1_dns_resolution(self):
        """Check 1: Does the domain resolve?"""
        self.log("=== Check 1: DNS Resolution ===", "START")
        try:
            result = socket.gethostbyname(self.domain)
            self.log(f"Domain resolves to: {result}", "SUCCESS")
            return True
        except socket.gaierror:
            self.log("Domain does not resolve yet", "ERROR")
            return False

    def check_2_cloudflare_pages(self):
        """Check 2: Does it point to Cloudflare Pages?"""
        self.log("=== Check 2: Cloudflare Pages Connection ===", "START")
        try:
            result = socket.gethostbyname(self.domain)
            if result.startswith(("104.", "172.", "173.")):
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
                elif "Error 1014" in response.text:
                    self.log("Error 1014: Cross-User CNAME issue", "ERROR")
                    self.log(
                        "  Solution: Remove manual CNAME, add via Pages Dashboard",
                        "INFO",
                    )
                    return False
                else:
                    self.log(f"HTTP Status: {response.status_code}", "WARNING")
                    return False
            else:
                self.log(f"Not a Cloudflare IP: {result}", "WARNING")
                return False
        except Exception as e:
            self.log(f"Connection failed: {e}", "ERROR")
            return False

    def check_3_github_txt_record(self):
        """Check 3: Is the GitHub Pages TXT verification record present?"""
        self.log("=== Check 3: GitHub Pages TXT Verification ===", "START")
        try:
            import dns.resolver

            answers = dns.resolver.resolve(self.challenge_host, "TXT")
            for rdata in answers:
                txt_value = str(rdata).strip('"')
                if self.github_challenge in txt_value:
                    self.log("GitHub verification TXT record found", "SUCCESS")
                    return True
            self.log("GitHub TXT record not found or incorrect", "ERROR")
            return False
        except ImportError:
            self.log(
                "dnspython not installed - skipping TXT record check "
                "(install with: pip install dnspython)",
                "WARNING",
            )
            self.log(
                f"  Required: {self.challenge_host} = {self.github_challenge}", "INFO"
            )
            return False
        except Exception as e:
            self.log(f"Cannot verify TXT record: {e}", "ERROR")
            self.log(
                f"  Required: {self.challenge_host} = {self.github_challenge}", "INFO"
            )
            return False

    def check_4_repository_cname(self):
        """Check 4: Is the CNAME file in the repository up to date?"""
        self.log("=== Check 4: Repository CNAME File ===", "START")
        cname_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "docs",
            "CNAME",
        )

        if not os.path.exists(cname_path):
            self.log(f"CNAME file not found at {cname_path}", "ERROR")
            self.log("  Create file with content: corehub.nexus", "INFO")
            return False

        with open(cname_path, "r", encoding="utf-8") as f:
            content = f.read().strip()

        if content == self.domain:
            self.log(f"CNAME file correct: {content}", "SUCCESS")
            return True
        else:
            self.log(f"CNAME file incorrect: '{content}'", "ERROR")
            self.log(f"  Expected: {self.domain}", "INFO")
            return False

    def check_5_cloudflare_headers(self):
        """Check 5: Are Cloudflare headers present on the domain?"""
        self.log("=== Check 5: Cloudflare Headers Detection ===", "START")
        try:
            response = requests.head(f"https://{self.domain}", timeout=5)
            if "cf-ray" in response.headers:
                self.log("Cloudflare headers detected (cf-ray)", "SUCCESS")
                return True
            else:
                self.log("No Cloudflare headers detected", "WARNING")
                self.log(
                    "  Verify domain is added in Cloudflare Pages dashboard", "INFO"
                )
                self.log(
                    "  Go to: dash.cloudflare.com -> Pages -> bsm -> Custom domains",
                    "INFO",
                )
                return False
        except Exception as e:
            self.log(f"Cannot reach domain: {e}", "ERROR")
            self.log(
                "  Verify domain is added in Cloudflare Pages dashboard", "INFO"
            )
            return False

    def run_all_checks(self):
        """Run all verification checks."""
        self.log("Starting CoreHub Nexus Full Verification", "START")
        self.log(f"Domain: {self.domain}", "INFO")
        self.log(f"Target: {self.pages_domain}", "INFO")

        checks = [
            ("DNS Resolution", self.check_1_dns_resolution),
            ("Cloudflare Pages", self.check_2_cloudflare_pages),
            ("GitHub TXT Record", self.check_3_github_txt_record),
            ("Repository CNAME", self.check_4_repository_cname),
            ("Cloudflare Headers", self.check_5_cloudflare_headers),
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
                f"Site should be accessible at https://{self.domain}", "SUCCESS"
            )
            return 0
        else:
            self.log("=" * 50, "INFO")
            self.log("VERIFICATION INCOMPLETE", "ERROR")
            self.log("Please fix the errors above and run again.", "ERROR")
            return 1


if __name__ == "__main__":
    agent = CoreHubVerificationAgent()
    exit_code = agent.run_all_checks()
    sys.exit(exit_code)
