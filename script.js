class CapacityForecastBot {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');

        this.currentSession = {
            timeWindow: null,
            staffCount: null,
            avgImplementationTime: null,
            availabilityRatio: null,
            waitingFor: null
        };

        this.capacityAllocation = {
            newImplementation: 0.65, // 65%
            updateRequest: 0.35      // 35%
        };

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleSend());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSend();
            }
        });
    }

    handleSend() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.chatInput.value = '';

        this.showTypingIndicator();

        setTimeout(() => {
            this.hideTypingIndicator();
            this.processMessage(message);
        }, 1000);
    }

    addMessage(content, type, isHTML = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (isHTML) {
            contentDiv.innerHTML = content;
        } else {
            contentDiv.textContent = content;
        }

        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);

        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            Bot is typing
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    processMessage(message) {
        const lowerMessage = message.toLowerCase();

        if (this.currentSession.waitingFor) {
            this.handleFollowUpInput(message);
            return;
        }

        this.parseInitialQuery(message);
    }

    parseInitialQuery(message) {
        const lowerMessage = message.toLowerCase();

        this.currentSession.timeWindow = this.extractTimeWindow(message);
        this.currentSession.staffCount = this.extractNumber(message, ['staff', 'people', 'team', 'members']);
        this.currentSession.avgImplementationTime = this.extractNumber(message, ['hours', 'hour', 'implementation', 'time']);
        this.currentSession.availabilityRatio = this.extractPercentage(message);

        if (!this.currentSession.timeWindow) {
            this.addMessage("I'd be happy to help with your capacity forecast! What time period are you planning for? (e.g., 'October 2025', 'next month', 'Q1 2026')", 'bot');
            this.currentSession.waitingFor = 'timeWindow';
            return;
        }

        this.collectMissingInputs();
    }

    extractTimeWindow(message) {
        const timePatterns = [
            /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i,
            /\b(next|this)\s+(month|quarter|year)\b/i,
            /\bq[1-4]\s+(\d{4})\b/i,
            /\b(\d{1,2})\/(\d{4})\b/,
            /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\b/i
        ];

        for (const pattern of timePatterns) {
            const match = message.match(pattern);
            if (match) {
                return match[0];
            }
        }

        return null;
    }

    extractNumber(message, keywords) {
        for (const keyword of keywords) {
            const pattern = new RegExp(`(\\d+)\\s*${keyword}`, 'i');
            const match = message.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
        return null;
    }

    extractPercentage(message) {
        const percentMatch = message.match(/(\d+)%/);
        if (percentMatch) {
            return parseInt(percentMatch[1]) / 100;
        }

        const ratioMatch = message.match(/0\.(\d+)/);
        if (ratioMatch) {
            return parseFloat(`0.${ratioMatch[1]}`);
        }

        return null;
    }

    handleFollowUpInput(message) {
        switch (this.currentSession.waitingFor) {
            case 'timeWindow':
                this.currentSession.timeWindow = this.extractTimeWindow(message) || message;
                this.currentSession.waitingFor = null;
                break;
            case 'staffCount':
                this.currentSession.staffCount = parseInt(message) || this.extractNumber(message, ['']);
                this.currentSession.waitingFor = null;
                break;
            case 'avgImplementationTime':
                this.currentSession.avgImplementationTime = parseFloat(message) || this.extractNumber(message, ['']);
                this.currentSession.waitingFor = null;
                break;
            case 'availabilityRatio':
                const percentage = parseInt(message);
                if (percentage) {
                    this.currentSession.availabilityRatio = percentage / 100;
                } else {
                    this.currentSession.availabilityRatio = parseFloat(message);
                }
                this.currentSession.waitingFor = null;
                break;
        }

        this.collectMissingInputs();
    }

    collectMissingInputs() {
        if (!this.currentSession.staffCount) {
            this.addMessage("How many staff members are on your team?", 'bot');
            this.currentSession.waitingFor = 'staffCount';
            return;
        }

        if (!this.currentSession.avgImplementationTime) {
            this.addMessage("What's the average time for New Implementation tasks in hours?", 'bot');
            this.currentSession.waitingFor = 'avgImplementationTime';
            return;
        }

        if (!this.currentSession.availabilityRatio) {
            this.addMessage("What's your expected availability ratio? (e.g., 80% or 0.8)", 'bot');
            this.currentSession.waitingFor = 'availabilityRatio';
            return;
        }

        this.calculateAndDisplayForecast();
    }

    calculateAndDisplayForecast() {
        try {
            const workingDays = this.calculateWorkingDays(this.currentSession.timeWindow);
            const totalHours = workingDays * 8 * this.currentSession.staffCount;
            const availableHours = totalHours * this.currentSession.availabilityRatio;

            // Calculate capacity for New Implementation and hours for Update Request
            const newImplHours = availableHours * this.capacityAllocation.newImplementation;
            const updateHours = availableHours * this.capacityAllocation.updateRequest;

            const newImplCapacity = Math.floor(newImplHours / this.currentSession.avgImplementationTime);
            // Update Request is tracked in hours, not task count

            const availabilityPercent = Math.round(this.currentSession.availabilityRatio * 100);

            const dashboardHTML = this.generateDashboard({
                timeWindow: this.currentSession.timeWindow,
                newImplCapacity,
                updateHours: Math.round(updateHours),
                workingDays,
                totalHours,
                availableHours: Math.round(availableHours),
                newImplHours: Math.round(newImplHours),
                staffCount: this.currentSession.staffCount,
                avgImplementationTime: this.currentSession.avgImplementationTime,
                availabilityPercent,
                newImplPercent: Math.round(this.capacityAllocation.newImplementation * 100),
                updatePercent: Math.round(this.capacityAllocation.updateRequest * 100)
            });

            this.addMessage(dashboardHTML, 'bot', true);
            this.resetSession();

        } catch (error) {
            this.addMessage("I had trouble calculating that forecast. Could you try rephrasing your time window?", 'bot');
            this.resetSession();
        }
    }

    generateDashboard(data) {
        return `
            <div class="capacity-dashboard">
                <div class="dashboard-header">
                    <div class="dashboard-title">Capacity Forecast</div>
                    <div class="time-period">${data.timeWindow}</div>
                </div>

                <div class="capacity-result">
                    <div class="capacity-number">${data.newImplCapacity}</div>
                    <div class="capacity-label">New Implementation Tasks</div>
                </div>

                <div class="task-type-breakdown">
                    <div class="task-type-card new-impl">
                        <div class="task-type-header">
                            <div class="task-type-title">New Implementation</div>
                            <div class="task-type-percentage">${data.newImplPercent}%</div>
                        </div>
                        <div class="task-type-capacity">${data.newImplCapacity}</div>
                        <div class="task-type-subtitle">tasks (${data.avgImplementationTime}h each)</div>
                    </div>
                    <div class="task-type-card update-req">
                        <div class="task-type-header">
                            <div class="task-type-title">Update Request</div>
                            <div class="task-type-percentage">${data.updatePercent}%</div>
                        </div>
                        <div class="task-type-capacity">${data.updateHours}h</div>
                        <div class="task-type-subtitle">allocated hours</div>
                    </div>
                </div>

                <div class="dashboard-metrics">
                    <div class="metrics-row-top">
                        <div class="metric-card">
                            <div class="metric-value">${data.staffCount}</div>
                            <div class="metric-label">Team Members</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${data.workingDays}</div>
                            <div class="metric-label">Working Days</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${data.availabilityPercent}%</div>
                            <div class="metric-label">Availability</div>
                        </div>
                    </div>
                    <div class="metrics-row-bottom">
                        <div class="metric-card metric-card-full">
                            <div class="metric-value">${data.availableHours}h</div>
                            <div class="metric-label">Available Hours</div>
                        </div>
                    </div>
                </div>

                <div class="calculation-breakdown">
                    <div class="calculation-title">📊 Calculation Breakdown</div>
                    <div class="calculation-step">
                        <span>Working Days in Period</span>
                        <span>${data.workingDays} days</span>
                    </div>
                    <div class="calculation-step">
                        <span>Total Available Hours</span>
                        <span>${data.workingDays} × 8 × ${data.staffCount} = ${data.totalHours}h</span>
                    </div>
                    <div class="calculation-step">
                        <span>Effective Working Hours</span>
                        <span>${data.totalHours} × ${data.availabilityPercent}% = ${data.availableHours}h</span>
                    </div>
                    <div class="calculation-step">
                        <span>New Implementation Hours (${data.newImplPercent}%)</span>
                        <span>${data.availableHours} × ${data.newImplPercent}% = ${data.newImplHours}h</span>
                    </div>
                    <div class="calculation-step">
                        <span>Update Request Hours (${data.updatePercent}%)</span>
                        <span>${data.availableHours} × ${data.updatePercent}% = ${data.updateHours}h</span>
                    </div>
                    <div class="calculation-step">
                        <span>New Implementation Tasks</span>
                        <span>${data.newImplHours}h ÷ ${data.avgImplementationTime}h = ${data.newImplCapacity} tasks</span>
                    </div>
                    <div class="calculation-formula">
                        Result: ${data.newImplCapacity} New Implementation tasks + ${data.updateHours}h for Update Requests
                    </div>
                </div>

                <div class="dashboard-actions">
                    <button class="action-button reset-button" onclick="capacityBot.handleReset()">
                        🔄 Calculate Another Scenario
                    </button>
                    <button class="action-button download-button" onclick="capacityBot.downloadPDF()">
                        📄 Download PDF Report
                    </button>
                </div>
            </div>
        `;
    }

    calculateWorkingDays(timeWindow) {
        const now = new Date();
        const currentYear = now.getFullYear();

        if (timeWindow.toLowerCase().includes('next month')) {
            const nextMonth = new Date(currentYear, now.getMonth() + 1, 1);
            return this.getWorkingDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth());
        }

        if (timeWindow.toLowerCase().includes('this month')) {
            return this.getWorkingDaysInMonth(currentYear, now.getMonth());
        }

        const monthMatch = timeWindow.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
        if (monthMatch) {
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
            const year = parseInt(monthMatch[2]);
            return this.getWorkingDaysInMonth(year, monthIndex);
        }

        const quarterMatch = timeWindow.match(/q([1-4])\s+(\d{4})/i);
        if (quarterMatch) {
            const quarter = parseInt(quarterMatch[1]);
            const year = parseInt(quarterMatch[2]);
            return this.getWorkingDaysInQuarter(year, quarter);
        }

        return 22;
    }

    getWorkingDaysInMonth(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }
        }

        return workingDays;
    }

    getWorkingDaysInQuarter(year, quarter) {
        const startMonth = (quarter - 1) * 3;
        let totalWorkingDays = 0;

        for (let i = 0; i < 3; i++) {
            totalWorkingDays += this.getWorkingDaysInMonth(year, startMonth + i);
        }

        return totalWorkingDays;
    }

    resetSession() {
        this.currentSession = {
            timeWindow: null,
            staffCount: null,
            avgImplementationTime: null,
            availabilityRatio: null,
            waitingFor: null
        };
    }

    handleReset() {
        this.resetSession();
        this.addMessage("Ready for a new capacity forecast! What time period would you like to plan for?", 'bot');
        this.chatInput.focus();
    }

    async downloadPDF() {
        const dashboard = document.querySelector('.capacity-dashboard');
        if (!dashboard) {
            alert('No dashboard found to export.');
            return;
        }

        try {
            // Check if libraries are loaded
            if (typeof html2canvas === 'undefined' || typeof window.jsPDF === 'undefined') {
                throw new Error('PDF libraries not loaded');
            }

            // Show loading indicator
            const downloadBtn = document.querySelector('.download-button');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '⏳ Generating PDF...';
            downloadBtn.disabled = true;

            // Create a container optimized for single-page PDF
            const pdfContainer = document.createElement('div');
            pdfContainer.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 750px;
                background: white;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-sizing: border-box;
            `;

            // Add compact PDF header
            const pdfHeader = document.createElement('div');
            pdfHeader.innerHTML = `
                <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #667eea; padding-bottom: 10px;">
                    <h1 style="color: #667eea; margin: 0; font-size: 1.4rem; font-weight: 700;">Capacity Forecast Report</h1>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 0.8rem;">Generated on ${new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </div>
            `;

            // Clone and style dashboard for PDF
            const dashboardClone = dashboard.cloneNode(true);

            // Remove action buttons
            const actionsDiv = dashboardClone.querySelector('.dashboard-actions');
            if (actionsDiv) {
                actionsDiv.remove();
            }

            // Apply compact PDF-specific styles
            dashboardClone.style.cssText = `
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 8px;
                padding: 1rem;
                margin: 0;
                box-shadow: none;
                max-width: 100%;
                font-size: 12px;
            `;

            // Compact styling for single-page PDF
            const styleOverrides = document.createElement('style');
            styleOverrides.textContent = `
                .dashboard-header { text-align: center; margin-bottom: 0.8rem; }
                .dashboard-title { font-size: 1.1rem; font-weight: 600; color: #2d3748; margin-bottom: 0.3rem; }
                .time-period { font-size: 0.9rem; color: #667eea; font-weight: 500; }
                .capacity-result { text-align: center; margin: 1rem 0; }
                .capacity-number { font-size: 2rem; font-weight: 700; color: #667eea; margin-bottom: 0.3rem; }
                .capacity-label { font-size: 0.9rem; color: #4a5568; font-weight: 500; }
                .task-type-breakdown { display: flex; gap: 0.75rem; margin: 1rem 0; }
                .task-type-card { flex: 1; background: white; border-radius: 8px; padding: 0.8rem; text-align: center; border-top: 3px solid; }
                .task-type-card.new-impl { border-top-color: #667eea; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); }
                .task-type-card.update-req { border-top-color: #48bb78; background: linear-gradient(135deg, #48bb7815 0%, #38a16915 100%); }
                .task-type-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
                .task-type-title { font-size: 0.8rem; font-weight: 600; color: #2d3748; }
                .task-type-percentage { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 15px; background: rgba(102, 126, 234, 0.1); color: #667eea; }
                .update-req .task-type-percentage { background: rgba(72, 187, 120, 0.1); color: #48bb78; }
                .task-type-capacity { font-size: 1.6rem; font-weight: 700; color: #2d3748; margin-bottom: 0.2rem; }
                .task-type-subtitle { font-size: 0.7rem; color: #718096; font-weight: 500; }
                .dashboard-metrics { margin: 1rem 0; }
                .metrics-row-top { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
                .metrics-row-bottom { display: flex; justify-content: center; }
                .metric-card { background: white; border-radius: 6px; padding: 0.6rem; text-align: center; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }
                .metric-card-full { width: 100%; max-width: 250px; }
                .metric-value { font-size: 1.2rem; font-weight: 600; color: #2d3748; margin-bottom: 0.2rem; }
                .metric-label { font-size: 0.7rem; color: #718096; font-weight: 500; }
                .calculation-breakdown { background: white; border-radius: 6px; padding: 0.8rem; margin-top: 0.8rem; border-left: 3px solid #667eea; }
                .calculation-title { font-size: 0.85rem; font-weight: 600; color: #2d3748; margin-bottom: 0.5rem; }
                .calculation-step { display: flex; justify-content: space-between; align-items: flex-start; padding: 0.3rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.75rem; line-height: 1.2; }
                .calculation-step:last-child { border-bottom: none; font-weight: 600; color: #667eea; }
                .calculation-formula { background: #f7fafc; border-radius: 4px; padding: 0.5rem; margin-top: 0.5rem; font-family: 'Monaco', 'Consolas', monospace; font-size: 0.7rem; color: #4a5568; text-align: center; }
            `;

            pdfContainer.appendChild(styleOverrides);
            pdfContainer.appendChild(pdfHeader);
            pdfContainer.appendChild(dashboardClone);
            document.body.appendChild(pdfContainer);

            // Generate PDF with optimized dimensions
            const canvas = await html2canvas(pdfContainer, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 750,
                height: Math.min(pdfContainer.scrollHeight, 1000),
                scrollX: 0,
                scrollY: 0
            });

            const { jsPDF } = window;
            const pdf = new jsPDF('p', 'mm', 'a4');

            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // Calculate dimensions to fit content on single page with margins
            const maxWidth = pdfWidth - 20; // 10mm margins on each side
            const maxHeight = pdfHeight - 20; // 10mm margins top and bottom

            // Convert pixels to mm (1 px ≈ 0.264583 mm at 96 DPI)
            const imgWidthMM = imgWidth * 0.264583;
            const imgHeightMM = imgHeight * 0.264583;

            // Scale to fit within page bounds
            const widthRatio = maxWidth / imgWidthMM;
            const heightRatio = maxHeight / imgHeightMM;
            const ratio = Math.min(widthRatio, heightRatio, 1); // Don't scale up

            const scaledWidth = imgWidthMM * ratio;
            const scaledHeight = imgHeightMM * ratio;
            const x = (pdfWidth - scaledWidth) / 2;
            const y = (pdfHeight - scaledHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

            // Generate filename
            const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
            const filename = `capacity-forecast-${timestamp}.pdf`;

            pdf.save(filename);

            // Restore button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;

            // Clean up
            document.body.removeChild(pdfContainer);

        } catch (error) {
            console.error('PDF generation error:', error);

            // Restore button
            const downloadBtn = document.querySelector('.download-button');
            if (downloadBtn) {
                downloadBtn.innerHTML = '📄 Download PDF Report';
                downloadBtn.disabled = false;
            }

            // Enhanced fallback with proper styling
            this.showPrintFallback(dashboard);
        }
    }

    showPrintFallback(dashboard) {
        const confirmation = confirm('PDF generation failed. Would you like to open a print-optimized version? You can save as PDF from the print dialog.');
        if (!confirmation) return;

        // Clone dashboard without actions
        const dashboardClone = dashboard.cloneNode(true);
        const actionsDiv = dashboardClone.querySelector('.dashboard-actions');
        if (actionsDiv) {
            actionsDiv.remove();
        }

        // Create print window with full styling
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Capacity Forecast Report</title>
                <style>
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none !important; }
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 20px;
                        background: white;
                    }
                    .capacity-dashboard {
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                        border-radius: 12px;
                        padding: 1.5rem;
                        margin: 1rem 0;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        max-width: 100%;
                    }
                    .dashboard-header { text-align: center; margin-bottom: 1.5rem; }
                    .dashboard-title { font-size: 1.4rem; font-weight: 600; color: #2d3748; margin-bottom: 0.5rem; }
                    .time-period { font-size: 1.1rem; color: #667eea; font-weight: 500; }
                    .capacity-result { text-align: center; margin: 2rem 0; }
                    .capacity-number { font-size: 3rem; font-weight: 700; color: #667eea; margin-bottom: 0.5rem; }
                    .capacity-label { font-size: 1.2rem; color: #4a5568; font-weight: 500; }
                    .task-type-breakdown { display: flex; gap: 1rem; margin: 1.5rem 0; }
                    .task-type-card { flex: 1; background: white; border-radius: 12px; padding: 1.25rem; text-align: center; border-top: 4px solid; }
                    .task-type-card.new-impl { border-top-color: #667eea; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); }
                    .task-type-card.update-req { border-top-color: #48bb78; background: linear-gradient(135deg, #48bb7815 0%, #38a16915 100%); }
                    .task-type-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
                    .task-type-title { font-size: 1rem; font-weight: 600; color: #2d3748; }
                    .task-type-percentage { font-size: 0.9rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 20px; background: rgba(102, 126, 234, 0.1); color: #667eea; }
                    .update-req .task-type-percentage { background: rgba(72, 187, 120, 0.1); color: #48bb78; }
                    .task-type-capacity { font-size: 2.5rem; font-weight: 700; color: #2d3748; margin-bottom: 0.25rem; }
                    .task-type-subtitle { font-size: 0.9rem; color: #718096; font-weight: 500; }
                    .dashboard-metrics { margin: 1.5rem 0; }
                    .metrics-row-top { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
                    .metrics-row-bottom { display: flex; justify-content: center; }
                    .metric-card { background: white; border-radius: 8px; padding: 1rem; text-align: center; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
                    .metric-card-full { width: 100%; max-width: 300px; }
                    .metric-value { font-size: 1.8rem; font-weight: 600; color: #2d3748; margin-bottom: 0.25rem; }
                    .metric-label { font-size: 0.9rem; color: #718096; font-weight: 500; }
                    .calculation-breakdown { background: white; border-radius: 8px; padding: 1rem; margin-top: 1rem; border-left: 4px solid #667eea; }
                    .calculation-title { font-size: 1rem; font-weight: 600; color: #2d3748; margin-bottom: 0.75rem; }
                    .calculation-step { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
                    .calculation-step:last-child { border-bottom: none; font-weight: 600; color: #667eea; }
                    .calculation-formula { background: #f7fafc; border-radius: 6px; padding: 0.75rem; margin-top: 0.75rem; font-family: 'Monaco', 'Consolas', monospace; font-size: 0.85rem; color: #4a5568; text-align: center; }
                    .dashboard-actions { display: none !important; }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align: center; margin-bottom: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                    <strong>Print Instructions:</strong> Use Ctrl+P (Cmd+P on Mac) → More Settings → Destination: Save as PDF
                    <br><button onclick="window.print()" style="margin-top: 10px; padding: 5px 15px;">Print Now</button>
                </div>
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px;">
                    <h1 style="color: #667eea; margin: 0; font-size: 2rem; font-weight: 700;">Capacity Forecast Report</h1>
                    <p style="color: #666; margin: 10px 0 0 0; font-size: 1rem;">Generated on ${new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </div>
                ${dashboardClone.outerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();

        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

}

// Global variable to access bot instance
let capacityBot;

document.addEventListener('DOMContentLoaded', () => {
    capacityBot = new CapacityForecastBot();
});