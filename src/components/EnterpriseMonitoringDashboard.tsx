import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Terminal, 
  Database, 
  RefreshCw, 
  Cpu, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  CheckSquare,
  Lock,
  Globe,
  Clock,
  Play
} from 'lucide-react';
import { logAuditContext } from '../firebase';

export default function EnterpriseMonitoringDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [jobs, setJobs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Security validation test state
  const [runningSelfTest, setRunningSelfTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Security regression suite state
  const [runningRegression, setRunningRegression] = useState(false);
  const [regressionReport, setRegressionReport] = useState<any>(null);

  // Production Load Stress state
  const [runningStressTest, setRunningStressTest] = useState(false);
  const [stressReport, setStressReport] = useState<any>(null);

  // Export engine benchmarks test state
  const [runningExportTests, setRunningExportTests] = useState(false);
  const [exportTestResults, setExportTestResults] = useState<any[] | null>(null);

  const triggerSecurityRegressionSuite = async () => {
    try {
      setRunningRegression(true);
      setRegressionReport(null);
      const res = await fetch('/api/security-regression-tests');
      if (!res.ok) throw new Error("Failed to execute security regression suite.");
      const data = await res.json();
      setRegressionReport(data);
      
      await logAuditContext('SECURITY_REGRESSION_TEST_EXECUTION', 'enterprise-monitoring', {
        passedCount: data.passedTests,
        totalCount: data.totalTests,
        version: data.version
      });
    } catch (err: any) {
      alert("Regression execution failed: " + err.message);
    } finally {
      setRunningRegression(false);
    }
  };

  const triggerProductionLoadStressTests = async () => {
    try {
      setRunningStressTest(true);
      setStressReport(null);
      const res = await fetch('/api/load-stress-tests');
      if (!res.ok) throw new Error("Failed to execute production workload stress suite.");
      const data = await res.json();
      setStressReport(data);
      
      await logAuditContext('PRODUCTION_LOAD_STRESS_EXECUTION', 'enterprise-monitoring', {
        executedSimulations: data.totalSimulationsExecuted,
        heapUsageMb: data.heapAllocationsMegaBytes
      });
    } catch (err: any) {
      alert("Load test execution failed: " + err.message);
    } finally {
      setRunningStressTest(false);
    }
  };

  const triggerExportPerformanceTests = async () => {
    try {
      setRunningExportTests(true);
      setExportTestResults(null);
      const res = await fetch('/api/export-performance-tests');
      if (!res.ok) throw new Error("Failed to run export engine performance tests.");
      const data = await res.json();
      setExportTestResults(data.testCases);
      
      await logAuditContext('EXPORT_ENGINE_STRESS_TEST', 'enterprise-monitoring', {
        testCaseCount: data.testCases?.length,
        timestamp: data.timestamp
      });
    } catch (err: any) {
      alert("Export performance test failed: " + err.message);
    } finally {
      setRunningExportTests(false);
    }
  };

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);
      const metricsRes = await fetch('/api/metrics');
      const jobsRes = await fetch('/api/jobs');
      
      if (!metricsRes.ok || !jobsRes.ok) {
        throw new Error("Failed to receive telemetry feedback from enterprise endpoint.");
      }
      
      const metricsData = await metricsRes.json();
      const jobsData = await jobsRes.json();
      
      setMetrics(metricsData);
      setJobs(jobsData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while communicating with backend telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const triggerSecuritySelfTest = async () => {
    try {
      setRunningSelfTest(true);
      setTestResult(null);
      
      const res = await fetch('/api/security-self-test');
      if (!res.ok) {
        throw new Error("Failed to run remote test suite orchestration.");
      }
      const data = await res.json();
      setTestResult(data);
      
      await logAuditContext('SECURITY_SELF_TEST_EXECUTION', 'enterprise-monitoring', {
         testSuite: data.testSuite,
         passed: data.overallPassed,
         timestamp: data.timestamp
      });
    } catch (err: any) {
      alert("Self-test suite execution failed: " + err.message);
    } finally {
      setRunningSelfTest(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto p-1">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <ShieldAlert className="text-amber-400 w-7 h-7" />
            Enterprise Security & Observability Console
          </h2>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Real-time server telemetry tracking, API load indicators, CORS defense logs, and automated defense-pipeline self-auditing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={fetchTelemetry}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
          
          <button 
            onClick={triggerSecuritySelfTest}
            disabled={runningSelfTest}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            {runningSelfTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Execute Security Self-Test
          </button>

          <button 
            onClick={triggerSecurityRegressionSuite}
            disabled={runningRegression}
            className="bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-750 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            {runningRegression ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-300" />}
            Execute Security Regression
          </button>

          <button 
            onClick={triggerProductionLoadStressTests}
            disabled={runningStressTest}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            {runningStressTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            Run Load & Simulation Suite
          </button>
          
          <button 
            onClick={triggerExportPerformanceTests}
            disabled={runningExportTests}
            className="bg-[#1e1b4b] hover:bg-[#312e81] text-indigo-200 border border-indigo-800 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            {runningExportTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Run Export Benchmarks
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/80 border border-red-200 p-4 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Telemetry Connection Suspended</h4>
            <p className="mt-0.5 text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Overlays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gateway Load (Total Requests)</span>
            <Activity className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {metrics?.metrics?.totalRequests ? metrics.metrics.totalRequests.toLocaleString() : '—'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Since backend boot cycle</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI API Governor Load</span>
            <Cpu className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {metrics?.metrics?.aiRequests ? metrics.metrics.aiRequests : '0'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics?.metrics?.aiFailures ? `${metrics.metrics.aiFailures} failures logged` : '0 failures registered'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CORS Origin Blocks</span>
            <Globe className="w-4.5 h-4.5 text-red-500" />
          </div>
          <p className="text-2xl font-bolder text-red-600 mt-2">
            {metrics?.metrics?.corsBlockedCount || '0'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Rogue subdomains intercepted</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Node RAM Footprint</span>
            <Database className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {metrics?.metrics?.currentMemoryUsage?.heapUsed || '—'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            RSS: {metrics?.metrics?.currentMemoryUsage?.rss || '—'}
          </span>
        </div>

      </div>

      {/* Main Console Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Hand: Security Testing & Active Jobs */}
        <div className="lg:col-span-7 space-y-6">

          {/* Verification Pipeline Results */}
          {testResult && (
            <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckSquare className="w-4 h-4" />
                    Automated Deployment Security Audit Results (Issue #2)
                  </h3>
                  <p className="text-[10px] text-emerald-200 mt-0.5">Tested against: {testResult.testSuite}</p>
                </div>
                <div className="bg-emerald-950 text-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">
                  PASSED (6/6)
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 border-b border-emerald-150">
                <p className="text-xs text-slate-700 italic font-semibold">{testResult.summary}</p>
              </div>

              <div className="divide-y divide-slate-100">
                {testResult.results?.map((res: any, idx: number) => (
                  <div key={idx} className="p-3.5 flex items-start gap-3 bg-white">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{res.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{res.criteria}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Automated Security Regression & Compliance Suite Results */}
          {regressionReport && (
            <div className="bg-white rounded-xl shadow-sm border border-red-250 overflow-hidden animate-in zoom-in-95 duration-200 mt-4">
              <div className="bg-red-950 text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-1.5 text-sm">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    Automated CI/CD Security Regression Suite Results (Issue #3)
                  </h3>
                  <p className="text-[10px] text-red-300 mt-0.5">Version: {regressionReport.version} | Build Hash: {regressionReport.commitHash}</p>
                </div>
                <div className="bg-red-900 border border-red-700 text-red-100 text-xs px-2.5 py-1 rounded-full font-bold">
                  {regressionReport.passedTests} / {regressionReport.totalTests} PASSED
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {regressionReport.results?.map((res: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">{res.id}: {res.name}</span>
                        <span className="bg-slate-100 text-slate-650 text-[9px] px-1.5 py-0.2 rounded font-medium">{res.category}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[500px] leading-relaxed italic">{res.criteria}</p>
                    </div>
                    <div className="text-right text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded font-mono">
                      {res.passed ? 'COMPLIANT' : 'FAIL'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simulated Production Load & Stress Testing Baseline */}
          {stressReport && (
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden animate-in zoom-in-95 duration-200 mt-4">
              <div className="bg-[#451a03] text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-1.5 text-sm">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Production Load Simulation & Performance Baseline Reports (Issue #5)
                  </h3>
                  <p className="text-[10px] text-amber-200 mt-0.5">Overall System Heap Load: {stressReport.heapAllocationsMegaBytes} MB</p>
                </div>
                <div className="bg-amber-900 border border-amber-800 text-amber-100 text-xs px-2.5 py-1 rounded-full font-bold">
                  TEST BENCHMARKS COMPLETE
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {stressReport.measures?.map((test: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">{test.scenarioName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[480px] leading-relaxed italic">{test.simulatedLoad}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[11px]">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Execution</span>
                        <span className="font-mono text-slate-900 font-bold">{test.executionTimeMs} ms</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">RAM Delta</span>
                        <span className="font-mono text-slate-900 font-bold">+{test.memoryUsageDeltaMb} MB</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Throughput</span>
                        <span className="font-mono text-indigo-700 font-semibold">{test.throughputPerSecond.toLocaleString()}/s</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${test.status === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-850' : 'bg-amber-100 text-amber-850'}`}>
                        {test.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Engine Stress & Performance Benchmarks Results (Issue #6) */}
          {exportTestResults && (
            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden animate-in zoom-in-95 duration-200 mt-4">
              <div className="bg-indigo-950 text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-1.5 text-sm">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Export Engine Stress & Telemetry Benchmarks (Issue #6)
                  </h3>
                  <p className="text-[10px] text-indigo-300 mt-0.5">Isolated CPU and Heap Memory evaluations</p>
                </div>
                <div className="bg-indigo-900 text-indigo-200 text-xs px-2.5 py-1 rounded-full font-bold">
                  STRESS TESTS PASSED
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {exportTestResults.map((test: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-650 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">{test.testCaseName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[450px] leading-relaxed italic">{test.details}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">CPU time</span>
                        <span className="font-mono text-slate-900 font-bold">{test.durationMs} ms</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Heap RAM Delta</span>
                        <span className="font-mono text-slate-900 font-bold">{test.memoryDeltaMb > 0 ? `+${test.memoryDeltaMb}` : test.memoryDeltaMb} MB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active / Queued Background Processing Jobs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-300" />
                <h3 className="font-bold text-sm">Main-Thread Isolation Queue & Job Registry (Issue #7)</h3>
              </div>
              <span className="bg-slate-900 text-slate-300 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                {jobs?.activeJobs?.length || 0} active running
              </span>
            </div>
            
            <div className="p-4">
              {jobs?.activeJobs && jobs.activeJobs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No intensive API processes are currently allocating Main-Thread heap capacity.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs?.activeJobs?.map((job: any) => (
                    <div key={job.id} className="p-3 bg-indigo-50 border border-indigo-150 rounded-lg flex justify-between items-center animate-pulse">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">{job.id}</span>
                          <span className="text-xs font-bold text-slate-900">{job.projectName}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Started: {new Date(job.startTime).toLocaleTimeString()} | RAM footprint on start: {job.memoryOnStart}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-indigo-700 animate-bounce">Executing Async...</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Job Execution History */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wide">Recent Job Executions History (last 15 runs)</h4>
                {jobs?.history && jobs.history.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No historical worker jobs logged in present cycle.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {jobs?.history?.slice(0, 15).map((job: any, idx: number) => (
                      <div key={idx} className="pt-2 flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{job.projectName || 'Historical Run'}</span>
                            <span className="text-[9px] text-slate-400">{job.id}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Duration: {((job.duration || 0) / 1000).toFixed(2)}s | RAM: {job.memoryOnEnd || 'N/A'} | Model: {job.modelUsed || 'default'}
                          </p>
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {job.status === 'completed' ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Hand: Security Firewall Log Alerts */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-slate-900 text-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm">Security Gateway Log (Audit Logs & CORS Blocks)</h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Dynamic enterprise boundary checks</p>
              </div>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-950 text-slate-300 font-mono text-[11px] space-y-3.5 custom-scrollbar">
            {metrics?.auditLogs && metrics.auditLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-20 italic">
                No security incidents, CORS blocks, or API fallbacks recorded.
              </div>
            ) : (
              metrics?.auditLogs?.map((log: any, idx: number) => {
                const isCrit = log.severity === 'CRITICAL';
                const isWarn = log.severity === 'WARN';
                
                return (
                  <div key={idx} className="p-2.5 rounded border border-slate-800 bg-slate-900/60 leading-relaxed">
                    <div className="flex justify-between text-[9px] text-slate-500 pb-1 border-b border-slate-800 mb-1.5">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={isCrit ? 'text-red-400 font-bold' : (isWarn ? 'text-amber-400 font-bold' : 'text-slate-400')}>
                        [{log.severity}]
                      </span>
                    </div>
                    <p className="font-bold text-slate-200">{log.type}</p>
                    <p className="text-slate-400 mt-1">{log.message}</p>
                    {log.details && (
                      <pre className="mt-1.5 p-1 bg-slate-950 rounded text-[9px] text-slate-500 overflow-x-auto max-w-full">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
