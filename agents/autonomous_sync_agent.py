#!/usr/bin/env python3
"""
BSM Autonomous Sync Agent
Verifies and syncs DNS configuration for corehub.nexus.
"""

import os
import sys
from datetime import datetime

import requests


class BSMNexusAgent:
    def __init__(self):
        self.domain = "corehub.nexus"
        self.expected_target = "bsm-8p4.pages.dev"
        self.zone_id = os.getenv("CF_ZONE_ID")
        self.api_token = os.getenv("CF_API_TOKEN")
        self.log_file = "logs/nexus-sync.log"

    def log(self, message, level="INFO"):
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] {level}: {message}"
        print(log_entry)
        os.makedirs("logs", exist_ok=True)
        with open(self.log_file, "a", encoding="utf-8") as file:
            file.write(log_entry + "\n")

    def verify_dns(self):
        """Verify domain CNAME points to Cloudflare Pages target."""
        self.log(f"Verifying DNS for {self.domain}", "START")

        try:
            response = requests.get(
                f"https://cloudflare-dns.com/dns-query?name={self.domain}&type=CNAME",
                headers={"Accept": "application/dns-json"},
                timeout=15,
            )
            response.raise_for_status()

            records = response.json().get("Answer", [])
            if not records:
                self.log("No DNS CNAME records found", "ERROR")
                return False

            for record in records:
                target = record.get("data", "").rstrip(".")
                if target == self.expected_target:
                    self.log(f"DNS verified: {self.domain} -> {target}", "SUCCESS")
                    return True

            self.log(
                f"DNS mismatch. Expected {self.expected_target}, got {records}",
                "ERROR",
            )
            return False
        except requests.RequestException as err:
            self.log(f"DNS verification request failed: {err}", "ERROR")
            return False
        except ValueError as err:
            self.log(f"DNS verification JSON parse error: {err}", "ERROR")
            return False

    def verify_cloudflare_api(self):
        """Verify Cloudflare API access with current credentials."""
        if not self.api_token or not self.zone_id:
            self.log("Cloudflare credentials not found in environment", "ERROR")
            return False

        try:
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            }
            response = requests.get(
                f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}",
                headers=headers,
                timeout=15,
            )
            if response.status_code == 200 and response.json().get("success"):
                self.log("Cloudflare API connection successful", "SUCCESS")
                return True

            self.log(
                f"Cloudflare API error: {response.status_code} {response.text}",
                "ERROR",
            )
            return False
        except requests.RequestException as err:
            self.log(f"API verification request failed: {err}", "ERROR")
            return False
        except ValueError as err:
            self.log(f"API verification JSON parse error: {err}", "ERROR")
            return False

    def run(self):
        """Run sync cycle and fail fast on verification errors."""
        self.log("Starting BSM Nexus Cycle", "START")

        if not self.verify_dns():
            self.log("DNS verification failed - aborting cycle", "ERROR")
            sys.exit(1)

        if not self.verify_cloudflare_api():
            self.log("Cloudflare API verification failed - aborting cycle", "ERROR")
            sys.exit(1)

        self.log("All verifications passed - sync cycle complete", "SUCCESS")
        return True


if __name__ == "__main__":
    agent = BSMNexusAgent()
    agent.run()
