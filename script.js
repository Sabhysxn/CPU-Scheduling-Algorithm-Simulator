// CPU Scheduling Algorithms Implementation
class CPUScheduler {
  constructor() {
    this.processes = []
    this.results = null
    this.initializeEventListeners()
    this.loadTheme()
  }

  initializeEventListeners() {
    document.getElementById("addBtn").addEventListener("click", () => this.addProcess())
    document.getElementById("generateBtn").addEventListener("click", () => this.generateRandom())
    document.getElementById("simulateBtn").addEventListener("click", () => this.simulate())
    document.getElementById("resetBtn").addEventListener("click", () => this.reset())
    document.getElementById("themeToggle").addEventListener("click", () => this.toggleTheme())
    document.getElementById("algorithm").addEventListener("change", (e) => this.updateQuantumVisibility(e))
    document.getElementById("burstTime").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addProcess()
    })
  }

  addProcess() {
    const pid = document.getElementById("processId").value.trim()
    const arrival = Number.parseInt(document.getElementById("arrivalTime").value) || 0
    const burst = Number.parseInt(document.getElementById("burstTime").value)
    const priority = Number.parseInt(document.getElementById("priority").value) || 1

    if (!pid || !burst) {
      alert("Please fill in Process ID and Burst Time")
      return
    }

    if (this.processes.some((p) => p.pid === pid)) {
      alert("Process ID already exists")
      return
    }

    this.processes.push({ pid, arrival, burst, priority, originalBurst: burst })
    this.clearInputs()
    this.renderProcessTable()
  }

  generateRandom() {
    this.processes = []
    const count = Math.floor(Math.random() * 3) + 3

    for (let i = 0; i < count; i++) {
      this.processes.push({
        pid: `P${i + 1}`,
        arrival: Math.floor(Math.random() * 5),
        burst: Math.floor(Math.random() * 8) + 1,
        priority: Math.floor(Math.random() * 5) + 1,
        originalBurst: 0,
      })
      this.processes[i].originalBurst = this.processes[i].burst
    }

    this.renderProcessTable()
  }

  clearInputs() {
    document.getElementById("processId").value = ""
    document.getElementById("arrivalTime").value = "0"
    document.getElementById("burstTime").value = ""
    document.getElementById("priority").value = "1"
  }

  renderProcessTable() {
    const tbody = document.getElementById("processTableBody")
    if (this.processes.length === 0) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="5" style="text-align: center; color: #999;">No processes added yet</td></tr>'
      return
    }

    tbody.innerHTML = this.processes
      .map(
        (p, idx) => `
            <tr>
                <td>${p.pid}</td>
                <td>${p.arrival}</td>
                <td>${p.burst}</td>
                <td>${p.priority}</td>
                <td><button class="delete-btn" onclick="scheduler.deleteProcess(${idx})">Delete</button></td>
            </tr>
        `,
      )
      .join("")
  }

  deleteProcess(idx) {
    this.processes.splice(idx, 1)
    this.renderProcessTable()
  }

  updateQuantumVisibility(e) {
    const quantumGroup = document.getElementById("quantumGroup")
    quantumGroup.style.display = e.target.value === "rr" ? "block" : "none"
  }

  simulate() {
    if (this.processes.length === 0) {
      alert("Please add at least one process")
      return
    }

    const algorithm = document.getElementById("algorithm").value
    const quantum = Number.parseInt(document.getElementById("quantum").value) || 2

    this.processes.forEach((p) => (p.burst = p.originalBurst))

    switch (algorithm) {
      case "fcfs":
        this.results = this.fcfs()
        break
      case "sjf":
        this.results = this.sjf()
        break
      case "srtf":
        this.results = this.srtf()
        break
      case "rr":
        this.results = this.roundRobin(quantum)
        break
      case "priority-np":
        this.results = this.priorityNonPreemptive()
        break
      case "priority-p":
        this.results = this.priorityPreemptive()
        break
    }

    this.displayResults()
  }

  fcfs() {
    const sorted = [...this.processes].sort((a, b) => a.arrival - b.arrival)
    const schedule = []
    let currentTime = 0
    const stats = []

    sorted.forEach((process) => {
      const startTime = Math.max(currentTime, process.arrival)
      const endTime = startTime + process.burst
      schedule.push({ pid: process.pid, start: startTime, end: endTime })

      stats.push({
        pid: process.pid,
        arrival: process.arrival,
        burst: process.originalBurst,
        completion: endTime,
        turnaround: endTime - process.arrival,
        waiting: startTime - process.arrival,
      })

      currentTime = endTime
    })

    return { schedule, stats, totalTime: currentTime }
  }

  sjf() {
    const sorted = [...this.processes].sort((a, b) => a.arrival - b.arrival)
    const schedule = []
    const stats = []
    let currentTime = 0
    const remaining = [...sorted]

    while (remaining.length > 0) {
      const available = remaining.filter((p) => p.arrival <= currentTime)
      if (available.length === 0) {
        currentTime = remaining[0].arrival
        continue
      }

      const process = available.reduce((a, b) => (a.burst < b.burst ? a : b))
      const startTime = currentTime
      const endTime = startTime + process.burst
      schedule.push({ pid: process.pid, start: startTime, end: endTime })

      stats.push({
        pid: process.pid,
        arrival: process.arrival,
        burst: process.originalBurst,
        completion: endTime,
        turnaround: endTime - process.arrival,
        waiting: startTime - process.arrival,
      })

      remaining.splice(remaining.indexOf(process), 1)
      currentTime = endTime
    }

    return { schedule, stats, totalTime: currentTime }
  }

  srtf() {
    const processes = JSON.parse(JSON.stringify(this.processes))
    const schedule = []
    const stats = new Map()
    let currentTime = 0

    processes.forEach((p) =>
      stats.set(p.pid, {
        arrival: p.arrival,
        originalBurst: p.originalBurst,
        completion: 0,
      }),
    )

    while (processes.some((p) => p.burst > 0)) {
      const available = processes.filter((p) => p.arrival <= currentTime && p.burst > 0)
      if (available.length === 0) {
        currentTime++
        continue
      }

      const process = available.reduce((a, b) => (a.burst < b.burst ? a : b))
      const lastEntry = schedule[schedule.length - 1]

      if (lastEntry && lastEntry.pid === process.pid) {
        lastEntry.end = currentTime + 1
      } else {
        schedule.push({ pid: process.pid, start: currentTime, end: currentTime + 1 })
      }

      process.burst--
      if (process.burst === 0) {
        stats.get(process.pid).completion = currentTime + 1
      }

      currentTime++
    }

    const result = Array.from(stats.entries()).map(([pid, stat]) => ({
      pid,
      arrival: stat.arrival,
      burst: stat.originalBurst,
      completion: stat.completion,
      turnaround: stat.completion - stat.arrival,
      waiting: stat.completion - stat.arrival - stat.originalBurst,
    }))

    return { schedule, stats: result, totalTime: currentTime }
  }

  roundRobin(quantum) {
    const queue = [...this.processes].sort((a, b) => a.arrival - b.arrival)
    const schedule = []
    const stats = []
    let currentTime = 0
    const remaining = queue.map((p) => ({ ...p, remaining: p.burst }))

    while (remaining.some((p) => p.remaining > 0)) {
      const available = remaining.filter((p) => p.arrival <= currentTime && p.remaining > 0)
      if (available.length === 0) {
        currentTime++
        continue
      }

      const process = available[0]
      const timeSlice = Math.min(quantum, process.remaining)
      schedule.push({ pid: process.pid, start: currentTime, end: currentTime + timeSlice })

      process.remaining -= timeSlice
      currentTime += timeSlice

      if (process.remaining === 0) {
        stats.push({
          pid: process.pid,
          arrival: process.arrival,
          burst: process.originalBurst,
          completion: currentTime,
          turnaround: currentTime - process.arrival,
          waiting: currentTime - process.arrival - process.originalBurst,
        })
      }
    }

    return { schedule, stats, totalTime: currentTime }
  }

  priorityNonPreemptive() {
    const sorted = [...this.processes].sort((a, b) => a.arrival - b.arrival)
    const schedule = []
    const stats = []
    let currentTime = 0
    const remaining = [...sorted]

    while (remaining.length > 0) {
      const available = remaining.filter((p) => p.arrival <= currentTime)
      if (available.length === 0) {
        currentTime = remaining[0].arrival
        continue
      }

      const process = available.reduce((a, b) => (a.priority < b.priority ? a : b))
      const startTime = currentTime
      const endTime = startTime + process.burst
      schedule.push({ pid: process.pid, start: startTime, end: endTime })

      stats.push({
        pid: process.pid,
        arrival: process.arrival,
        burst: process.originalBurst,
        completion: endTime,
        turnaround: endTime - process.arrival,
        waiting: startTime - process.arrival,
      })

      remaining.splice(remaining.indexOf(process), 1)
      currentTime = endTime
    }

    return { schedule, stats, totalTime: currentTime }
  }

  priorityPreemptive() {
    const processes = JSON.parse(JSON.stringify(this.processes))
    const schedule = []
    const stats = new Map()
    let currentTime = 0

    processes.forEach((p) =>
      stats.set(p.pid, {
        arrival: p.arrival,
        originalBurst: p.originalBurst,
        completion: 0,
      }),
    )

    while (processes.some((p) => p.burst > 0)) {
      const available = processes.filter((p) => p.arrival <= currentTime && p.burst > 0)
      if (available.length === 0) {
        currentTime++
        continue
      }

      const process = available.reduce((a, b) => (a.priority < b.priority ? a : b))
      const lastEntry = schedule[schedule.length - 1]

      if (lastEntry && lastEntry.pid === process.pid) {
        lastEntry.end = currentTime + 1
      } else {
        schedule.push({ pid: process.pid, start: currentTime, end: currentTime + 1 })
      }

      process.burst--
      if (process.burst === 0) {
        stats.get(process.pid).completion = currentTime + 1
      }

      currentTime++
    }

    const result = Array.from(stats.entries()).map(([pid, stat]) => ({
      pid,
      arrival: stat.arrival,
      burst: stat.originalBurst,
      completion: stat.completion,
      turnaround: stat.completion - stat.arrival,
      waiting: stat.completion - stat.arrival - stat.originalBurst,
    }))

    return { schedule, stats: result, totalTime: currentTime }
  }

  displayResults() {
    const resultsSection = document.getElementById("resultsSection")
    resultsSection.style.display = "block"

    this.displayGanttChart()
    this.displayStatsTable()
    this.displaySummary()

    resultsSection.scrollIntoView({ behavior: "smooth" })
  }

  displayGanttChart() {
    const ganttChart = document.getElementById("ganttChart")
    const ganttTimeline = document.querySelector(".gantt-timeline")

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#ff6b6b", "#4ecdc4", "#45b7d1"]
    const colorMap = {}
    const processClasses = ["p1", "p2", "p3", "p4", "p5", "p6"]

    this.results.schedule.forEach((item) => {
      if (!colorMap[item.pid]) {
        const index = Object.keys(colorMap).length
        colorMap[item.pid] = {
          color: colors[index % colors.length],
          class: processClasses[index % processClasses.length],
        }
      }
    })

    // Create single-line display with process names and time ranges
    const ganttDisplay = this.results.schedule
      .map((item) => {
        const colorInfo = colorMap[item.pid]
        return `<span class="gantt-process-item ${colorInfo.class}" title="${item.pid}: ${item.start}-${item.end}">${item.pid}(${item.start}-${item.end})</span>`
      })
      .join("")

    ganttChart.innerHTML = ganttDisplay

    // Display timeline
    let timelineHTML = ""
    for (let i = 0; i <= this.results.totalTime; i++) {
      timelineHTML += `<div class="timeline-marker">${i}</div>`
    }
    ganttTimeline.innerHTML = timelineHTML
  }

  displayStatsTable() {
    const tbody = document.getElementById("statsBody")
    tbody.innerHTML = this.results.stats
      .map(
        (stat) => `
            <tr>
                <td>${stat.pid}</td>
                <td>${stat.arrival}</td>
                <td>${stat.burst}</td>
                <td>${stat.completion}</td>
                <td>${stat.turnaround}</td>
                <td>${stat.waiting}</td>
            </tr>
        `,
      )
      .join("")
  }

  displaySummary() {
    const avgWaiting = this.results.stats.reduce((sum, s) => sum + s.waiting, 0) / this.results.stats.length
    const avgTurnaround = this.results.stats.reduce((sum, s) => sum + s.turnaround, 0) / this.results.stats.length
    const cpuUtilization = ((this.results.totalTime - 0) / this.results.totalTime) * 100

    document.getElementById("avgWaitingTime").textContent = avgWaiting.toFixed(2)
    document.getElementById("avgTurnaroundTime").textContent = avgTurnaround.toFixed(2)
    document.getElementById("cpuUtilization").textContent = cpuUtilization.toFixed(2)
    document.getElementById("totalTime").textContent = this.results.totalTime
  }

  reset() {
    this.processes = []
    this.results = null
    this.clearInputs()
    this.renderProcessTable()
    document.getElementById("resultsSection").style.display = "none"
  }

  toggleTheme() {
    document.body.classList.toggle("dark-mode")
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light")
    this.updateThemeIcon()
  }

  updateThemeIcon() {
    const icon = document.querySelector(".theme-toggle i")
    if (document.body.classList.contains("dark-mode")) {
      icon.classList.remove("fa-moon")
      icon.classList.add("fa-sun")
    } else {
      icon.classList.remove("fa-sun")
      icon.classList.add("fa-moon")
    }
  }

  loadTheme() {
    const theme = localStorage.getItem("theme")
    if (theme === "dark") {
      document.body.classList.add("dark-mode")
    }
    this.updateThemeIcon()
  }
}

class AnimatedBackground {
  constructor() {
    this.canvas = document.getElementById("animatedBg")
    this.ctx = this.canvas.getContext("2d")
    this.particles = []
    this.waves = []
    this.setupCanvas()
    this.createParticles()
    this.createWaves()
    this.animate()
    window.addEventListener("resize", () => this.setupCanvas())
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  createParticles() {
    const particleCount = Math.min(80, Math.floor(window.innerWidth / 15))
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 3 + 0.5,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.6 + 0.15,
        originalOpacity: Math.random() * 0.6 + 0.15,
      })
    }
  }

  createWaves() {
    this.waves = [
      { y: this.canvas.height * 0.25, amplitude: 40, frequency: 0.008, phase: 0, speed: 0.018 },
      { y: this.canvas.height * 0.55, amplitude: 35, frequency: 0.006, phase: Math.PI, speed: 0.012 },
      { y: this.canvas.height * 0.8, amplitude: 30, frequency: 0.01, phase: Math.PI / 2, speed: 0.022 },
    ]
  }

  drawParticles() {
    this.particles.forEach((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.opacity += (Math.random() - 0.5) * 0.015

      if (particle.x < 0) particle.x = this.canvas.width
      if (particle.x > this.canvas.width) particle.x = 0
      if (particle.y < 0) particle.y = this.canvas.height
      if (particle.y > this.canvas.height) particle.y = 0

      particle.opacity = Math.max(0.05, Math.min(0.8, particle.opacity))

      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  drawWaves() {
    this.waves.forEach((wave) => {
      wave.phase += wave.speed

      this.ctx.strokeStyle = `rgba(255, 255, 255, 0.12)`
      this.ctx.lineWidth = 2.5
      this.ctx.beginPath()

      for (let x = 0; x < this.canvas.width; x += 4) {
        const y = wave.y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude
        if (x === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      this.ctx.stroke()
    })
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.drawWaves()
    this.drawParticles()

    requestAnimationFrame(() => this.animate())
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const scheduler = new CPUScheduler()
  window.scheduler = scheduler // Make it globally accessible
  new AnimatedBackground()
})
