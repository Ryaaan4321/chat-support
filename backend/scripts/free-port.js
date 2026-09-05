const { execSync } = require('child_process');

try {
  const port = process.env.SOCKET_PORT || 4001;
  const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  const lines = output.split('\n');
  const pids = new Set();

  for (const line of lines) {
    if (line.includes(`:${port}`) && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pidStr = parts[parts.length - 1];
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
        pids.add(pid);
      }
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }
} catch {}

