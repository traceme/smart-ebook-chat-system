#!/usr/bin/env python3
"""
Comprehensive test runner for SECS backend.

Usage:
    python tests/run_tests.py --type unit
    python tests/run_tests.py --type integration
    python tests/run_tests.py --type e2e
    python tests/run_tests.py --type performance
    python tests/run_tests.py --type all
"""

import argparse
import subprocess
import sys
import os
import time
from typing import List, Dict, Any
import json
from pathlib import Path


class TestRunner:
    """Comprehensive test runner for SECS backend."""
    
    def __init__(self):
        """Initialize test runner."""
        self.project_root = Path(__file__).parent.parent
        self.test_results: Dict[str, Any] = {}
        
    def run_unit_tests(self) -> bool:
        """Run unit tests with pytest."""
        print("🧪 Running Unit Tests...")
        
        cmd = [
            "poetry", "run", "pytest",
            "tests/unit/",
            "-v",
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov/unit",
            "--cov-report=xml:coverage-unit.xml",
            "--junitxml=test-results-unit.xml",
            "-m", "not slow"
        ]
        
        result = subprocess.run(cmd, cwd=self.project_root, capture_output=True, text=True)
        
        self.test_results["unit"] = {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr,
            "duration": time.time()
        }
        
        if result.returncode == 0:
            print("✅ Unit tests passed!")
        else:
            print("❌ Unit tests failed!")
            print(result.stdout)
            print(result.stderr)
        
        return result.returncode == 0
    
    def run_integration_tests(self) -> bool:
        """Run integration tests."""
        print("🔗 Running Integration Tests...")
        
        # Ensure test database is clean
        self._setup_test_environment()
        
        cmd = [
            "poetry", "run", "pytest",
            "tests/integration/",
            "-v",
            "--junitxml=test-results-integration.xml",
            "-m", "integration"
        ]
        
        result = subprocess.run(cmd, cwd=self.project_root, capture_output=True, text=True)
        
        self.test_results["integration"] = {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr,
            "duration": time.time()
        }
        
        if result.returncode == 0:
            print("✅ Integration tests passed!")
        else:
            print("❌ Integration tests failed!")
            print(result.stdout)
            print(result.stderr)
        
        return result.returncode == 0
    
    def run_e2e_tests(self) -> bool:
        """Run end-to-end tests."""
        print("🌐 Running E2E Tests...")
        
        # Check if services are running
        if not self._check_services():
            print("❌ Required services are not running. Please start docker-compose services.")
            return False
        
        cmd = [
            "poetry", "run", "pytest",
            "tests/e2e/",
            "-v",
            "--junitxml=test-results-e2e.xml",
            "-m", "e2e"
        ]
        
        result = subprocess.run(cmd, cwd=self.project_root, capture_output=True, text=True)
        
        self.test_results["e2e"] = {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr,
            "duration": time.time()
        }
        
        if result.returncode == 0:
            print("✅ E2E tests passed!")
        else:
            print("❌ E2E tests failed!")
            print(result.stdout)
            print(result.stderr)
        
        return result.returncode == 0
    
    def run_performance_tests(self, duration: str = "2m", users: int = 50) -> bool:
        """Run performance tests with Locust."""
        print("🚀 Running Performance Tests...")
        
        if not self._check_services():
            print("❌ Required services are not running for performance tests.")
            return False
        
        # Run Locust in headless mode
        cmd = [
            "poetry", "run", "locust",
            "-f", "tests/performance/locustfile.py",
            "--headless",
            "--users", str(users),
            "--spawn-rate", str(min(users // 5, 10)),
            "--run-time", duration,
            "--host", "http://localhost:8000",
            "--html", "performance-report.html",
            "--csv", "performance-results"
        ]
        
        result = subprocess.run(cmd, cwd=self.project_root, capture_output=True, text=True)
        
        self.test_results["performance"] = {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr,
            "duration": time.time()
        }
        
        if result.returncode == 0:
            print("✅ Performance tests completed!")
            print("📊 Performance report saved to performance-report.html")
        else:
            print("❌ Performance tests failed!")
            print(result.stdout)
            print(result.stderr)
        
        return result.returncode == 0
    
    def run_security_tests(self) -> bool:
        """Run security tests and vulnerability scans."""
        print("🔒 Running Security Tests...")
        
        # Run pytest security tests
        cmd = [
            "poetry", "run", "pytest",
            "tests/",
            "-v",
            "-k", "security",
            "--junitxml=test-results-security.xml"
        ]
        
        result = subprocess.run(cmd, cwd=self.project_root, capture_output=True, text=True)
        
        security_success = result.returncode == 0
        
        # Run additional security scans if available
        try:
            # Example: bandit for security linting
            bandit_cmd = ["poetry", "run", "bandit", "-r", "app/", "-f", "json", "-o", "security-report.json"]
            bandit_result = subprocess.run(bandit_cmd, cwd=self.project_root, capture_output=True, text=True)
            
            if bandit_result.returncode == 0:
                print("✅ Security linting passed!")
            else:
                print("⚠️ Security linting found issues. Check security-report.json")
        except FileNotFoundError:
            print("ℹ️ Bandit not available, skipping security linting")
        
        self.test_results["security"] = {
            "success": security_success,
            "output": result.stdout,
            "errors": result.stderr,
            "duration": time.time()
        }
        
        return security_success
    
    def run_all_tests(self) -> bool:
        """Run all test suites."""
        print("🎯 Running All Tests...")
        
        test_types = ["unit", "integration", "security"]
        all_passed = True
        
        for test_type in test_types:
            if test_type == "unit":
                passed = self.run_unit_tests()
            elif test_type == "integration":
                passed = self.run_integration_tests()
            elif test_type == "security":
                passed = self.run_security_tests()
            
            all_passed = all_passed and passed
            print()  # Add spacing
        
        # Run E2E and performance tests if basic tests pass
        if all_passed:
            print("🌐 Basic tests passed, running advanced tests...")
            self.run_e2e_tests()
            self.run_performance_tests(duration="1m", users=20)  # Shorter for CI
        
        return all_passed
    
    def generate_test_report(self) -> None:
        """Generate comprehensive test report."""
        print("📊 Generating Test Report...")
        
        report = {
            "timestamp": time.time(),
            "summary": {
                "total_suites": len(self.test_results),
                "passed_suites": sum(1 for r in self.test_results.values() if r["success"]),
                "failed_suites": sum(1 for r in self.test_results.values() if not r["success"])
            },
            "results": self.test_results
        }
        
        with open("test-report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        # Generate markdown report
        self._generate_markdown_report(report)
        
        print("📋 Test report saved to test-report.json and test-report.md")
    
    def _generate_markdown_report(self, report: Dict[str, Any]) -> None:
        """Generate markdown test report."""
        md_content = [
            "# SECS Backend Test Report",
            f"Generated at: {time.ctime(report['timestamp'])}",
            "",
            "## Summary",
            f"- Total test suites: {report['summary']['total_suites']}",
            f"- Passed: {report['summary']['passed_suites']} ✅",
            f"- Failed: {report['summary']['failed_suites']} ❌",
            "",
            "## Results by Test Suite",
            ""
        ]
        
        for suite_name, results in report["results"].items():
            status = "✅ PASSED" if results["success"] else "❌ FAILED"
            md_content.extend([
                f"### {suite_name.title()} Tests {status}",
                "",
                "```",
                results["output"][:500] + "..." if len(results["output"]) > 500 else results["output"],
                "```",
                ""
            ])
        
        with open("test-report.md", "w") as f:
            f.write("\n".join(md_content))
    
    def _setup_test_environment(self) -> None:
        """Setup test environment variables and database."""
        os.environ["TESTING"] = "true"
        os.environ["DATABASE_URL"] = "sqlite:///./test.db"
        
        # Clean up any existing test database
        test_db_files = ["test.db", "test.db-shm", "test.db-wal"]
        for db_file in test_db_files:
            if os.path.exists(db_file):
                os.remove(db_file)
    
    def _check_services(self) -> bool:
        """Check if required services are running."""
        required_services = [
            ("http://localhost:8000/health", "Backend API"),
            ("http://localhost:6333/collections", "Qdrant Vector DB"),
            ("http://localhost:9000/minio/health/live", "MinIO Storage")
        ]
        
        import requests
        
        for url, service in required_services:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code not in [200, 404]:  # 404 is OK for some health checks
                    print(f"❌ {service} is not responding correctly")
                    return False
            except requests.exceptions.RequestException:
                print(f"❌ {service} is not reachable at {url}")
                return False
        
        return True


def main():
    """Main entry point for test runner."""
    parser = argparse.ArgumentParser(description="SECS Backend Test Runner")
    parser.add_argument(
        "--type",
        choices=["unit", "integration", "e2e", "performance", "security", "all"],
        default="unit",
        help="Type of tests to run"
    )
    parser.add_argument(
        "--performance-duration",
        default="2m",
        help="Duration for performance tests (default: 2m)"
    )
    parser.add_argument(
        "--performance-users",
        type=int,
        default=50,
        help="Number of users for performance tests (default: 50)"
    )
    parser.add_argument(
        "--generate-report",
        action="store_true",
        help="Generate comprehensive test report"
    )
    
    args = parser.parse_args()
    
    runner = TestRunner()
    success = False
    
    if args.type == "unit":
        success = runner.run_unit_tests()
    elif args.type == "integration":
        success = runner.run_integration_tests()
    elif args.type == "e2e":
        success = runner.run_e2e_tests()
    elif args.type == "performance":
        success = runner.run_performance_tests(
            duration=args.performance_duration,
            users=args.performance_users
        )
    elif args.type == "security":
        success = runner.run_security_tests()
    elif args.type == "all":
        success = runner.run_all_tests()
    
    if args.generate_report:
        runner.generate_test_report()
    
    if not success:
        sys.exit(1)
    
    print("🎉 All requested tests completed successfully!")


if __name__ == "__main__":
    main() 