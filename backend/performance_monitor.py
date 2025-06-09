#!/usr/bin/env python3
"""
Performance Monitoring and Optimization Tool for Smart Ebook Chat System

This tool monitors system performance across all services and provides:
- Real-time performance metrics
- Database query analysis
- Memory and CPU usage tracking
- API response time monitoring
- Bottleneck identification
- Optimization recommendations
"""

import asyncio
import json
import time
import logging
import psutil
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import subprocess
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ServiceMetrics:
    """Metrics for a specific service."""
    service_name: str
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    response_time_ms: Optional[float] = None
    error_rate: float = 0.0
    uptime_hours: Optional[float] = None

@dataclass
class SystemPerformance:
    """Overall system performance snapshot."""
    timestamp: datetime
    total_cpu_percent: float
    total_memory_gb: float
    available_memory_gb: float
    disk_usage_percent: float
    network_io: Dict[str, int]
    service_metrics: List[ServiceMetrics]
    recommendations: List[str]

class PerformanceMonitor:
    """System performance monitor with optimization recommendations."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.metrics_history: List[SystemPerformance] = []
        self.session = requests.Session()
        
        # Docker service mapping
        self.docker_services = {
            "backend-backend-1": "FastAPI Backend",
            "backend-celery-worker-1": "Celery Worker", 
            "backend-db-1": "PostgreSQL",
            "backend-minio-1": "MinIO Storage",
            "backend-qdrant-1": "Qdrant Vector DB",
            "backend-redis-1": "Redis Cache"
        }

    def get_docker_container_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get Docker container statistics."""
        try:
            # Get container stats using docker stats command
            result = subprocess.run(
                ["docker", "stats", "--no-stream", "--format", "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"Docker stats failed: {result.stderr}")
                return {}
            
            lines = result.stdout.strip().split('\n')[1:]  # Skip header
            container_stats = {}
            
            for line in lines:
                if line.strip():
                    parts = line.split('\t')
                    if len(parts) >= 4:
                        name = parts[0].strip()
                        cpu_str = parts[1].strip().replace('%', '')
                        mem_usage = parts[2].strip()
                        mem_percent_str = parts[3].strip().replace('%', '')
                        
                        try:
                            cpu_percent = float(cpu_str)
                            mem_percent = float(mem_percent_str)
                            
                            # Parse memory usage (e.g., "123.4MiB / 1.234GiB")
                            mem_parts = mem_usage.split(' / ')
                            if len(mem_parts) == 2:
                                used_mem = self._parse_memory_string(mem_parts[0])
                                
                                container_stats[name] = {
                                    'cpu_percent': cpu_percent,
                                    'memory_mb': used_mem,
                                    'memory_percent': mem_percent
                                }
                        except ValueError as e:
                            logger.warning(f"Failed to parse stats for {name}: {e}")
            
            return container_stats
            
        except Exception as e:
            logger.error(f"Failed to get Docker stats: {e}")
            return {}

    def _parse_memory_string(self, mem_str: str) -> float:
        """Parse memory string like '123.4MiB' to MB."""
        mem_str = mem_str.strip()
        if mem_str.endswith('MiB'):
            return float(mem_str[:-3])
        elif mem_str.endswith('GiB'):
            return float(mem_str[:-3]) * 1024
        elif mem_str.endswith('KiB'):
            return float(mem_str[:-3]) / 1024
        else:
            # Assume MB if no unit
            return float(mem_str.split()[0])

    def get_api_response_times(self) -> Dict[str, float]:
        """Measure API endpoint response times."""
        endpoints = [
            "/health",
            "/vector-search/health"
        ]
        
        response_times = {}
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                
                if response.status_code == 200:
                    response_times[endpoint] = response_time
                else:
                    response_times[endpoint] = -1  # Error indicator
                    
            except Exception as e:
                logger.warning(f"Failed to measure response time for {endpoint}: {e}")
                response_times[endpoint] = -1
        
        return response_times

    def get_system_metrics(self) -> SystemPerformance:
        """Collect comprehensive system metrics."""
        timestamp = datetime.now()
        
        # System-wide metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        # Docker container metrics
        container_stats = self.get_docker_container_stats()
        
        # API response times
        response_times = self.get_api_response_times()
        
        # Build service metrics
        service_metrics = []
        
        for container_name, stats in container_stats.items():
            service_name = self.docker_services.get(container_name, container_name)
            
            # Add response time if available
            response_time = None
            if "backend" in container_name.lower():
                response_time = response_times.get("/health")
            elif "qdrant" in container_name.lower():
                response_time = response_times.get("/vector-search/health")
            
            service_metrics.append(ServiceMetrics(
                service_name=service_name,
                cpu_percent=stats['cpu_percent'],
                memory_mb=stats['memory_mb'],
                memory_percent=stats['memory_percent'],
                response_time_ms=response_time
            ))
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            cpu_percent, memory, container_stats, response_times
        )
        
        return SystemPerformance(
            timestamp=timestamp,
            total_cpu_percent=cpu_percent,
            total_memory_gb=memory.total / (1024**3),
            available_memory_gb=memory.available / (1024**3),
            disk_usage_percent=disk.percent,
            network_io={
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv
            },
            service_metrics=service_metrics,
            recommendations=recommendations
        )

    def _generate_recommendations(
        self, 
        cpu_percent: float, 
        memory: Any, 
        container_stats: Dict, 
        response_times: Dict
    ) -> List[str]:
        """Generate performance optimization recommendations."""
        recommendations = []
        
        # CPU recommendations
        if cpu_percent > 80:
            recommendations.append("High CPU usage detected - consider scaling up or optimizing CPU-intensive processes")
        elif cpu_percent > 60:
            recommendations.append("Moderate CPU usage - monitor for sustained high load")
        
        # Memory recommendations
        memory_usage_percent = (memory.used / memory.total) * 100
        if memory_usage_percent > 85:
            recommendations.append("High memory usage - consider increasing available RAM or optimizing memory consumption")
        elif memory_usage_percent > 70:
            recommendations.append("Memory usage is elevated - monitor for memory leaks")
        
        # Container-specific recommendations
        for container_name, stats in container_stats.items():
            service_name = self.docker_services.get(container_name, container_name)
            
            if stats['cpu_percent'] > 50:
                recommendations.append(f"{service_name} has high CPU usage - investigate workload or scale resources")
            
            if stats['memory_mb'] > 1024:  # More than 1GB
                recommendations.append(f"{service_name} using significant memory ({stats['memory_mb']:.0f}MB) - check for memory leaks")
        
        # Response time recommendations
        for endpoint, response_time in response_times.items():
            if response_time > 1000:  # More than 1 second
                recommendations.append(f"Endpoint {endpoint} is slow ({response_time:.0f}ms) - investigate performance bottlenecks")
            elif response_time > 500:  # More than 500ms
                recommendations.append(f"Endpoint {endpoint} response time is elevated ({response_time:.0f}ms)")
        
        return recommendations

    def monitor_continuous(self, duration_minutes: int = 10, interval_seconds: int = 30):
        """Run continuous monitoring for specified duration."""
        logger.info(f"🔍 Starting continuous monitoring for {duration_minutes} minutes")
        logger.info(f"📊 Collecting metrics every {interval_seconds} seconds")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        while time.time() < end_time:
            try:
                metrics = self.get_system_metrics()
                self.metrics_history.append(metrics)
                
                self._log_current_metrics(metrics)
                
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                logger.info("🛑 Monitoring interrupted by user")
                break
            except Exception as e:
                logger.error(f"❌ Error during monitoring: {e}")
                time.sleep(interval_seconds)
        
        # Generate summary report
        return self._generate_monitoring_report()

    def _log_current_metrics(self, metrics: SystemPerformance):
        """Log current metrics in a readable format."""
        logger.info("=" * 50)
        logger.info(f"⏰ {metrics.timestamp.strftime('%H:%M:%S')}")
        logger.info(f"🖥️  CPU: {metrics.total_cpu_percent:.1f}%")
        logger.info(f"💾 Memory: {metrics.available_memory_gb:.1f}GB available / {metrics.total_memory_gb:.1f}GB total")
        logger.info(f"💿 Disk: {metrics.disk_usage_percent:.1f}% used")
        
        logger.info("🐳 Service Status:")
        for service in metrics.service_metrics:
            response_info = ""
            if service.response_time_ms is not None:
                if service.response_time_ms > 0:
                    response_info = f", Response: {service.response_time_ms:.0f}ms"
                else:
                    response_info = ", Response: ERROR"
            
            logger.info(f"   {service.service_name}: CPU {service.cpu_percent:.1f}%, "
                       f"RAM {service.memory_mb:.0f}MB{response_info}")
        
        if metrics.recommendations:
            logger.info("💡 Recommendations:")
            for rec in metrics.recommendations:
                logger.info(f"   • {rec}")

    def _generate_monitoring_report(self) -> Dict[str, Any]:
        """Generate comprehensive monitoring report."""
        if not self.metrics_history:
            return {"error": "No metrics collected"}
        
        # Calculate averages and trends
        avg_cpu = sum(m.total_cpu_percent for m in self.metrics_history) / len(self.metrics_history)
        max_cpu = max(m.total_cpu_percent for m in self.metrics_history)
        
        avg_memory_usage = sum(
            (m.total_memory_gb - m.available_memory_gb) / m.total_memory_gb * 100 
            for m in self.metrics_history
        ) / len(self.metrics_history)
        
        # Service performance analysis
        service_analysis = {}
        for metrics in self.metrics_history:
            for service in metrics.service_metrics:
                if service.service_name not in service_analysis:
                    service_analysis[service.service_name] = {
                        'cpu_samples': [],
                        'memory_samples': [],
                        'response_times': []
                    }
                
                service_analysis[service.service_name]['cpu_samples'].append(service.cpu_percent)
                service_analysis[service.service_name]['memory_samples'].append(service.memory_mb)
                
                if service.response_time_ms is not None and service.response_time_ms > 0:
                    service_analysis[service.service_name]['response_times'].append(service.response_time_ms)
        
        # Calculate service averages
        service_summary = {}
        for service_name, data in service_analysis.items():
            service_summary[service_name] = {
                'avg_cpu': sum(data['cpu_samples']) / len(data['cpu_samples']) if data['cpu_samples'] else 0,
                'max_cpu': max(data['cpu_samples']) if data['cpu_samples'] else 0,
                'avg_memory_mb': sum(data['memory_samples']) / len(data['memory_samples']) if data['memory_samples'] else 0,
                'max_memory_mb': max(data['memory_samples']) if data['memory_samples'] else 0,
                'avg_response_time': sum(data['response_times']) / len(data['response_times']) if data['response_times'] else None,
                'max_response_time': max(data['response_times']) if data['response_times'] else None
            }
        
        # Collect all unique recommendations
        all_recommendations = []
        for metrics in self.metrics_history:
            all_recommendations.extend(metrics.recommendations)
        unique_recommendations = list(dict.fromkeys(all_recommendations))
        
        # Generate optimization priorities
        optimization_priorities = self._generate_optimization_priorities(service_summary, avg_cpu, avg_memory_usage)
        
        report = {
            "monitoring_summary": {
                "duration_minutes": len(self.metrics_history) * 0.5,  # Assuming 30s intervals
                "samples_collected": len(self.metrics_history),
                "avg_cpu_percent": round(avg_cpu, 2),
                "max_cpu_percent": round(max_cpu, 2),
                "avg_memory_usage_percent": round(avg_memory_usage, 2)
            },
            "service_performance": service_summary,
            "recommendations": unique_recommendations,
            "optimization_priorities": optimization_priorities,
            "generated_at": datetime.now().isoformat()
        }
        
        return report

    def _generate_optimization_priorities(
        self, 
        service_summary: Dict, 
        avg_cpu: float, 
        avg_memory: float
    ) -> List[Dict[str, Any]]:
        """Generate prioritized optimization recommendations."""
        priorities = []
        
        # High priority issues
        if avg_cpu > 70:
            priorities.append({
                "priority": "HIGH",
                "category": "CPU",
                "issue": f"High average CPU usage ({avg_cpu:.1f}%)",
                "action": "Scale up CPU resources or optimize CPU-intensive processes"
            })
        
        if avg_memory > 80:
            priorities.append({
                "priority": "HIGH", 
                "category": "Memory",
                "issue": f"High memory usage ({avg_memory:.1f}%)",
                "action": "Increase available RAM or investigate memory leaks"
            })
        
        # Service-specific priorities
        for service_name, metrics in service_summary.items():
            if metrics['avg_cpu'] > 40:
                priorities.append({
                    "priority": "MEDIUM",
                    "category": "Service Performance",
                    "issue": f"{service_name} high CPU usage ({metrics['avg_cpu']:.1f}%)",
                    "action": f"Optimize {service_name} or allocate more resources"
                })
            
            if metrics['avg_response_time'] and metrics['avg_response_time'] > 500:
                priorities.append({
                    "priority": "MEDIUM",
                    "category": "Response Time",
                    "issue": f"{service_name} slow response time ({metrics['avg_response_time']:.0f}ms)",
                    "action": f"Investigate {service_name} performance bottlenecks"
                })
        
        # Sort by priority
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        priorities.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        return priorities

    def run_performance_snapshot(self) -> Dict[str, Any]:
        """Take a single performance snapshot."""
        logger.info("📸 Taking performance snapshot...")
        
        metrics = self.get_system_metrics()
        self._log_current_metrics(metrics)
        
        return {
            "snapshot": asdict(metrics),
            "timestamp": metrics.timestamp.isoformat()
        }


def main():
    """Main function for performance monitoring."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Smart Ebook Chat System Performance Monitor")
    parser.add_argument("--mode", choices=["snapshot", "continuous"], default="snapshot",
                       help="Monitoring mode: snapshot (single check) or continuous")
    parser.add_argument("--duration", type=int, default=10,
                       help="Duration for continuous monitoring in minutes (default: 10)")
    parser.add_argument("--interval", type=int, default=30,
                       help="Interval between measurements in seconds (default: 30)")
    parser.add_argument("--output", type=str, 
                       help="Output file for the monitoring report (JSON format)")
    
    args = parser.parse_args()
    
    monitor = PerformanceMonitor()
    
    if args.mode == "snapshot":
        print("📸 Performance Snapshot Mode")
        print("=" * 50)
        
        result = monitor.run_performance_snapshot()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Snapshot saved to: {args.output}")
    
    else:  # continuous mode
        print(f"🔍 Continuous Monitoring Mode ({args.duration} minutes)")
        print("=" * 50)
        
        report = monitor.monitor_continuous(
            duration_minutes=args.duration,
            interval_seconds=args.interval
        )
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 MONITORING SUMMARY")
        print("=" * 60)
        
        summary = report["monitoring_summary"]
        print(f"Duration: {summary['duration_minutes']:.1f} minutes")
        print(f"Samples: {summary['samples_collected']}")
        print(f"Avg CPU: {summary['avg_cpu_percent']}%")
        print(f"Max CPU: {summary['max_cpu_percent']}%")
        print(f"Avg Memory: {summary['avg_memory_usage_percent']}%")
        
        # Print optimization priorities
        if report["optimization_priorities"]:
            print(f"\n🎯 OPTIMIZATION PRIORITIES")
            print("=" * 40)
            for i, priority in enumerate(report["optimization_priorities"], 1):
                print(f"{i}. [{priority['priority']}] {priority['issue']}")
                print(f"   Action: {priority['action']}")
        
        # Save report if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\n💾 Full report saved to: {args.output}")
        else:
            # Save with timestamp
            timestamp = int(time.time())
            filename = f"performance_report_{timestamp}.json"
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\n💾 Full report saved to: {filename}")


if __name__ == "__main__":
    main()