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

        this.conversationState = {
            currentParameters: { ...this.currentSession },
            history: [],
            scenarios: [],
            insights: [],
            conversationContext: [],
            lastResult: null,
            parameterHistory: []
        };

        this.capacityAllocation = {
            newImplementation: 0.65, // 65%
            updateRequest: 0.35      // 35%
        };

        // AI Enhancement Configuration
        // SECURITY NOTE: API keys are loaded from environment variables (.env file)
        // Fallback to localStorage for manual setup via chat: "set api key YOUR_API_KEY"
        this.aiConfig = {
            geminiApiKey: null, // Will be loaded from environment or localStorage
            geminiModel: 'gemini-1.5-flash',
            apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
            enabled: false,
            retryAttempts: 3,
            requestTimeout: 30000
        };

        // Initialize API key from environment variables
        this.initializeApiKey();

        // Load saved conversation state
        this.loadConversationState();

        this.initializeEventListeners();
    }

    async initializeApiKey() {
        try {
            // First, try to load from environment variables
            if (window.envLoader) {
                await window.envLoader.loadEnv();
                const envApiKey = window.envLoader.get('GEMINI_API_KEY');

                if (envApiKey && envApiKey !== 'your_actual_api_key_here') {
                    this.aiConfig.geminiApiKey = envApiKey;
                    this.aiConfig.enabled = true;
                    console.log('🤖 AI enhancements enabled from environment variables');
                    return;
                }
            }

            // Fallback to localStorage
            const storedApiKey = localStorage.getItem('gemini_api_key');
            if (storedApiKey) {
                this.aiConfig.geminiApiKey = storedApiKey;
                this.aiConfig.enabled = true;
                console.log('🤖 AI enhancements enabled from localStorage');
                return;
            }

            console.log('💡 AI features available. Set your API key with: "set api key YOUR_KEY"');

        } catch (error) {
            console.warn('Error initializing API key:', error);
            console.log('💡 Falling back to manual API key setup via chat command');
        }
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

        setTimeout(async () => {
            this.hideTypingIndicator();
            await this.processMessage(message);
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

    async processMessage(message) {
        // Check for API key setup command
        const apiKeyMatch = message.match(/set\s+api\s+key\s+([A-Za-z0-9_-]+)/i);
        if (apiKeyMatch) {
            this.setApiKey(apiKeyMatch[1]);
            return;
        }

        // Check for AI queries - but only if no parameters exist yet
        // If we have parameters, treat everything as a follow-up conversation
        if (!this.hasCompleteParameters()) {
            const aiQueryPatterns = [
                /(?:ai|analyze|insights?|recommend|suggest|explain|why|how can i|what if|optimize)/i,
                /(?:help me understand|give me advice|what should i|can you analyze)/i,
                /(?:industry benchmark|best practice|comparison|trend)/i
            ];

            const isAIQuery = aiQueryPatterns.some(pattern => pattern.test(message)) &&
                             !this.isCapacityForecastQuery(message);

            if (isAIQuery && this.conversationState.lastResult) {
                this.handleAIQueryAsync(message);
                return;
            }
        }

        // Check if this is a conversational adjustment to existing parameters
        if (this.hasCompleteParameters()) {
            const parseResult = this.parseConversationalInput(message, this.currentSession);

            if (parseResult.isAdjustment || parseResult.isSatisfactionQuery) {
                console.log('🔍 Detected follow-up query:', parseResult);
                this.handleConversationalAdjustment(message, parseResult);
                return;
            }
        } else {
            console.log('⚠️ Missing parameters for follow-up, current session:', this.currentSession);
        }

        if (this.currentSession.waitingFor) {
            await this.handleFollowUpInput(message);
            return;
        }

        await this.parseInitialQuery(message);
    }

    isCapacityForecastQuery(message) {
        const forecastPatterns = [
            /(?:capacity|forecast|how much|how many|calculate)/i,
            /(?:month|quarter|staff|team|hours|tasks)/i,
            /(?:availability|implementation|time)/i
        ];

        return forecastPatterns.some(pattern => pattern.test(message));
    }

    async handleAIQueryAsync(message) {
        this.addMessage("🤔 Let me analyze that for you...", 'bot');

        try {
            // For AI queries, show enhanced forecast with analysis
            await this.calculateAndDisplayEnhancedForecast(null, true);

            // Also provide AI response if available
            if (this.aiConfig.enabled) {
                const response = await this.handleAIQuery(message);
                this.addMessage(response, 'bot');
            }
        } catch (error) {
            this.addMessage("I had trouble processing that AI query. Please try again or rephrase your question.", 'bot');
        }
    }

    hasCompleteParameters() {
        return this.currentSession.timeWindow &&
               this.currentSession.staffCount &&
               this.currentSession.avgImplementationTime &&
               this.currentSession.availabilityRatio;
    }

    async handleConversationalAdjustment(message, parseResult) {
        this.showTypingIndicator();

        // Add to conversation history first
        this.addToConversationHistory(message, null, this.currentSession, null);

        // Determine what type of response is needed
        const hasParameterChanges = Object.keys(parseResult.adjustments).some(key =>
            key !== 'targetCapacity' && parseResult.adjustments[key] !== undefined
        );

        const hasTargetCapacity = parseResult.adjustments.targetCapacity !== undefined;
        const isGeneralAnalysis = parseResult.intent === 'analyze current forecast';

        // Apply parameter changes if any
        if (hasParameterChanges) {
            this.applyParameterChanges(parseResult);
        }

        setTimeout(async () => {
            this.hideTypingIndicator();

            // Generate appropriate response based on query type
            let responseMessage = this.generateResponseMessage(message, parseResult, hasParameterChanges, hasTargetCapacity, isGeneralAnalysis);

            if (responseMessage) {
                this.addMessage(responseMessage, 'bot');
            }

            // Always show enhanced analysis for follow-up questions (no redundant basic forecast)
            await this.calculateAndDisplayEnhancedForecast(
                parseResult.adjustments.targetCapacity,
                true,
                false  // Don't show full dashboard for follow-up questions
            );
        }, 1000);
    }

    applyParameterChanges(parseResult) {
        if (parseResult.adjustments.staffCount !== undefined) {
            this.trackParameterChange('staffCount', this.currentSession.staffCount, parseResult.adjustments.staffCount, parseResult.intent);
            this.currentSession.staffCount = parseResult.adjustments.staffCount;
        }

        if (parseResult.adjustments.availabilityRatio !== undefined) {
            this.trackParameterChange('availabilityRatio', this.currentSession.availabilityRatio, parseResult.adjustments.availabilityRatio, parseResult.intent);
            this.currentSession.availabilityRatio = parseResult.adjustments.availabilityRatio;
        }

        if (parseResult.adjustments.avgImplementationTime !== undefined) {
            this.trackParameterChange('avgImplementationTime', this.currentSession.avgImplementationTime, parseResult.adjustments.avgImplementationTime, parseResult.intent);
            this.currentSession.avgImplementationTime = parseResult.adjustments.avgImplementationTime;
        }
    }

    generateResponseMessage(message, parseResult, hasParameterChanges, hasTargetCapacity, isGeneralAnalysis) {
        if (hasParameterChanges && parseResult.intent) {
            return `Updated to ${parseResult.intent}. Here's your new forecast:`;
        }

        if (hasTargetCapacity) {
            const targetCapacity = parseResult.adjustments.targetCapacity;
            const currentCapacity = parseResult.adjustments.currentCapacity || 0;
            const isRelative = parseResult.adjustments.isRelativeTarget;
            const gapToTarget = parseResult.adjustments.gapToTarget;

            if (currentCapacity >= targetCapacity) {
                return `🎯 **Target Analysis:** You're already at ${currentCapacity} implementations, which ${currentCapacity === targetCapacity ? 'meets' : 'exceeds'} your target of ${targetCapacity}. Let me show you your current performance analysis.`;
            }

            let gapAnalysis;
            if (isRelative) {
                const additionalTasks = parseResult.adjustments.additionalTasks;
                gapAnalysis = `📊 **Gap Analysis:** Current ${currentCapacity} → Target ${targetCapacity} implementations (need ${additionalTasks} more)`;
            } else {
                const needed = Math.abs(gapToTarget);
                gapAnalysis = `📊 **Gap Analysis:** Current ${currentCapacity} → Target ${targetCapacity} implementations (need ${needed} more)`;
            }

            return `🎯 **Target Confirmed:** ${targetCapacity} total implementations\n${gapAnalysis}\n\nAnalyzing scenarios to achieve your target...`;
        }

        if (isGeneralAnalysis) {
            // Generate contextual responses based on the original message
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('improve') || lowerMessage.includes('better') || lowerMessage.includes('increase')) {
                return "🔍 **Improvement Analysis:** Let me analyze ways to optimize your capacity with different scenarios.";
            }

            if (lowerMessage.includes('what if') || lowerMessage.includes('scenario')) {
                return "🔮 **Scenario Analysis:** Here are different what-if scenarios based on your current parameters.";
            }

            if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('advice')) {
                return "💡 **Recommendations:** Based on your current forecast, here are my strategic recommendations.";
            }

            if (lowerMessage.includes('feasible') || lowerMessage.includes('possible') || lowerMessage.includes('realistic')) {
                return "⚖️ **Feasibility Analysis:** Let me analyze realistic options and their implementation difficulty.";
            }

            if (lowerMessage.includes('cost') || lowerMessage.includes('budget') || lowerMessage.includes('expensive')) {
                return "💰 **Cost-Benefit Analysis:** Here are scenarios considering budget and resource implications.";
            }

            return "📈 **Detailed Analysis:** Let me provide a comprehensive analysis of your capacity forecast.";
        }

        if (parseResult.isSatisfactionQuery) {
            return "🚀 **Improvement Opportunities:** I understand you'd like to enhance these results. Let me show you targeted scenarios to boost your capacity.";
        }

        return null; // No specific response needed
    }

    async generateAndShowScenarios(targetCapacity = null) {
        // Use the enhanced forecast method to show scenarios and analysis
        await this.calculateAndDisplayEnhancedForecast(targetCapacity, true);
    }

    formatScenariosForDisplay(scenarios) {
        let html = `<div class="scenarios-container">
            <div class="scenarios-header">
                <h3>💡 Scenario Suggestions</h3>
                <p>Here are some ways to improve your capacity:</p>
            </div>
            <div class="scenarios-grid">`;

        scenarios.forEach((scenario, index) => {
            const increase = scenario.result.newImplCapacity - this.conversationState.lastResult?.newImplCapacity || 0;
            const feasibilityColor = scenario.feasibility === 'High' ? '#48bb78' : scenario.feasibility === 'Medium' ? '#ed8936' : '#e53e3e';

            html += `
                <div class="scenario-card" data-scenario-id="${index}">
                    <div class="scenario-header">
                        <div class="scenario-name">${scenario.name}</div>
                        <div class="scenario-feasibility" style="color: ${feasibilityColor}">
                            ${scenario.feasibility} Feasibility
                        </div>
                    </div>
                    <div class="scenario-result">
                        <div class="scenario-capacity">${scenario.result.newImplCapacity}</div>
                        <div class="scenario-capacity-label">implementations</div>
                        ${increase > 0 ? `<div class="scenario-increase">+${increase} vs current</div>` : ''}
                    </div>
                    <div class="scenario-changes">
                        ${scenario.changes.map(change => `<span class="change-tag">${change}</span>`).join('')}
                    </div>
                    <button class="scenario-apply-btn" onclick="capacityBot.applyScenario(${index})">
                        Apply This Scenario
                    </button>
                </div>`;
        });

        html += `</div></div>`;

        // Store scenarios for later use
        this.conversationState.scenarios = scenarios;
        this.saveConversationState();

        return html;
    }

    async applyScenario(scenarioIndex) {
        const scenario = this.conversationState.scenarios[scenarioIndex];
        if (!scenario) return;

        // Track changes
        Object.keys(scenario.parameters).forEach(key => {
            if (this.currentSession[key] !== scenario.parameters[key]) {
                this.trackParameterChange(key, this.currentSession[key], scenario.parameters[key], `Applied scenario: ${scenario.name}`);
            }
        });

        // Apply parameters
        this.currentSession = { ...this.currentSession, ...scenario.parameters };

        // Show updated forecast
        this.addMessage(`Applied scenario: "${scenario.name}". Here's your updated forecast:`, 'bot');
        await this.calculateAndDisplayForecast();
    }

    async parseInitialQuery(message) {
        this.currentSession.timeWindow = this.extractTimeWindow(message);
        this.currentSession.staffCount = this.extractNumber(message, ['staff', 'people', 'team', 'members']);
        this.currentSession.avgImplementationTime = this.extractNumber(message, ['hours', 'hour', 'implementation', 'time']);
        this.currentSession.availabilityRatio = this.extractPercentage(message);

        if (!this.currentSession.timeWindow) {
            this.addMessage("I'd be happy to help with your capacity forecast! What time period are you planning for? (e.g., 'October 2025', 'next month', 'Q1 2026')", 'bot');
            this.currentSession.waitingFor = 'timeWindow';
            return;
        }

        await this.collectMissingInputs();
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

    async handleFollowUpInput(message) {
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

        await this.collectMissingInputs();
    }

    async collectMissingInputs() {
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

        await this.calculateAndDisplayForecast();
    }

    async calculateAndDisplayForecast() {
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
                updatePercent: Math.round(this.capacityAllocation.updateRequest * 100),
                isInitialResult: true // Flag to indicate this is the first result
            });

            this.addMessage(dashboardHTML, 'bot', true);

            // Store result for future comparisons
            this.conversationState.lastResult = {
                newImplCapacity,
                updateHours: Math.round(updateHours),
                workingDays,
                totalHours,
                availableHours: Math.round(availableHours),
                newImplHours: Math.round(newImplHours),
                availabilityPercent,
                newImplPercent: Math.round(this.capacityAllocation.newImplementation * 100),
                updatePercent: Math.round(this.capacityAllocation.updateRequest * 100)
            };
            this.saveConversationState();

            // Don't reset session after successful calculation to allow follow-up questions

        } catch (error) {
            this.addMessage("I had trouble calculating that forecast. Could you try rephrasing your time window?", 'bot');
            // Don't reset session to allow user to fix their input while preserving parameters
        }
    }

    async calculateAndDisplayEnhancedForecast(targetCapacity = null, includeAnalysis = true, showFullDashboard = true) {
        try {
            const workingDays = this.calculateWorkingDays(this.currentSession.timeWindow);
            const totalHours = workingDays * 8 * this.currentSession.staffCount;
            const availableHours = totalHours * this.currentSession.availabilityRatio;

            // Calculate capacity for New Implementation and hours for Update Request
            const newImplHours = availableHours * this.capacityAllocation.newImplementation;
            const updateHours = availableHours * this.capacityAllocation.updateRequest;

            const newImplCapacity = Math.floor(newImplHours / this.currentSession.avgImplementationTime);
            const availabilityPercent = Math.round(this.currentSession.availabilityRatio * 100);

            // Perform enhanced analysis only for follow-up questions
            const constraints = includeAnalysis ? this.validateConstraints(this.currentSession) : null;
            const scenarios = includeAnalysis ? this.generateScenarios(this.currentSession, targetCapacity) : null;

            // Generate AI insights if enabled and requested
            const aiInsights = includeAnalysis ?
                await this.generateAIInsights(this.currentSession, {
                    newImplCapacity,
                    updateHours: Math.round(updateHours),
                    availableHours: Math.round(availableHours)
                }, targetCapacity) : null;

            let displayHTML;

            if (showFullDashboard) {
                // Show complete dashboard for initial results
                displayHTML = this.generateDashboard({
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
                    updatePercent: Math.round(this.capacityAllocation.updateRequest * 100),
                    constraints,
                    scenarios,
                    aiInsights,
                    isInitialResult: false
                });
            } else {
                // Show only analysis sections for follow-up questions
                displayHTML = this.generateAnalysisOnly({
                    constraints,
                    scenarios,
                    aiInsights,
                    targetCapacity
                });
            }

            this.addMessage(displayHTML, 'bot', true);

            // Store result for future comparisons
            this.conversationState.lastResult = {
                newImplCapacity,
                updateHours: Math.round(updateHours),
                workingDays,
                totalHours,
                availableHours: Math.round(availableHours),
                newImplHours: Math.round(newImplHours),
                availabilityPercent,
                newImplPercent: Math.round(this.capacityAllocation.newImplementation * 100),
                updatePercent: Math.round(this.capacityAllocation.updateRequest * 100)
            };
            this.saveConversationState();

        } catch (error) {
            this.addMessage("I had trouble calculating that forecast. Could you try rephrasing your request?", 'bot');
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
                        <div class="metric-card">
                            <div class="metric-value">${data.availableHours}h</div>
                            <div class="metric-label">Available Hours</div>
                        </div>
                    </div>
                </div>

                <div class="calculation-breakdown">
                    <div class="calculation-header">
                        <div class="calculation-title">📊 Calculation Breakdown</div>
                        <button class="calculation-toggle" onclick="capacityBot.toggleCalculationBreakdown()" aria-label="Toggle calculation details">
                            <span class="toggle-text">Hide Details</span>
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="calculation-content" id="calculationContent">
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
                </div>

                ${data.constraints ? this.generateConstraintsSection(data.constraints) : ''}
                ${data.aiInsights ? this.generateAIInsightsSection(data.aiInsights) : ''}
                ${data.scenarios ? this.generateScenariosSection(data.scenarios) : ''}

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

    generateAnalysisOnly(data) {
        return `
            <div class="capacity-dashboard">
                ${data.constraints ? this.generateConstraintsSection(data.constraints) : ''}
                ${data.aiInsights ? this.generateAIInsightsSection(data.aiInsights) : ''}
                ${data.scenarios ? this.generateScenariosSection(data.scenarios) : ''}
            </div>
        `;
    }

    generateSensitivitySection(sensitivity) {
        if (!sensitivity || !sensitivity.recommendations.length) return '';

        const mostSensitive = sensitivity.mostSensitive;
        const recommendations = sensitivity.recommendations.map(rec =>
            `<div class="sensitivity-recommendation ${rec.priority}">
                <span class="rec-icon">${rec.type === 'hiring' ? '👥' : rec.type === 'efficiency' ? '⚡' : '🔧'}</span>
                <span class="rec-message">${rec.message}</span>
            </div>`
        ).join('');

        return `
            <div class="sensitivity-analysis">
                <div class="analysis-header">
                    <h3>💡 Sensitivity Analysis</h3>
                    <p>Most impactful parameter: <strong>${mostSensitive.param.replace(/([A-Z])/g, ' $1').toLowerCase()}</strong></p>
                </div>
                <div class="sensitivity-recommendations">
                    ${recommendations}
                </div>
            </div>
        `;
    }

    generateConstraintsSection(constraints) {
        if (!constraints || (!constraints.warnings.length && !constraints.errors.length)) return '';

        const warnings = constraints.warnings.map(warning =>
            `<div class="constraint-item warning">
                <span class="constraint-icon">⚠️</span>
                <span class="constraint-message">${warning}</span>
            </div>`
        ).join('');

        const errors = constraints.errors.map(error =>
            `<div class="constraint-item error">
                <span class="constraint-icon">❌</span>
                <span class="constraint-message">${error}</span>
            </div>`
        ).join('');

        return `
            <div class="constraints-validation">
                <div class="constraints-header">
                    <h3>⚠️ Validation Alerts</h3>
                </div>
                <div class="constraints-list">
                    ${errors}
                    ${warnings}
                </div>
            </div>
        `;
    }

    generateAIInsightsSection(aiInsights) {
        if (!aiInsights || !aiInsights.length) return '';

        const insightCards = aiInsights.map((insight, index) => {
            // Format the insight message for better readability
            const formattedMessage = this.formatInsightMessage(insight.message);

            return `<div class="ai-insight-card">
                <div class="insight-icon">💡</div>
                <div class="insight-content">
                    <div class="insight-number">Insight ${index + 1}</div>
                    <div class="insight-message">${formattedMessage}</div>
                    <div class="insight-source">AI Analysis</div>
                </div>
            </div>`
        }).join('');

        return `
            <div class="ai-insights-container">
                <div class="insights-header">
                    <h3>🤖 AI Insights (${aiInsights.length})</h3>
                    <p>AI-powered analysis of your capacity forecast</p>
                </div>
                <div class="insights-grid">
                    ${insightCards}
                </div>
            </div>
        `;
    }

    formatInsightMessage(message) {
        // Add better formatting for readability
        return message
            // Bold important numbers and percentages
            .replace(/(\d+%)/g, '<strong>$1</strong>')
            .replace(/(\d+(?:\.\d+)?)\s*(hours?|tasks?|staff|people)/gi, '<strong>$1 $2</strong>')
            // Bold important terms
            .replace(/\b(risk|warning|opportunity|recommend|suggest|consider|important|critical)\b/gi, '<strong>$1</strong>')
            // Add line breaks for better readability (if contains multiple sentences)
            .replace(/\.\s+([A-Z])/g, '.<br><br>$1')
            // Format percentages in a more readable way
            .replace(/(\d+)-(\d+)%/g, '<span class="range">$1-$2%</span>');
    }

    generateScenariosSection(scenarios) {
        if (!scenarios || !scenarios.length) return '';

        // Check if these are target-focused scenarios
        const hasTargetFocused = scenarios.some(s => s.targetFocused || s.targetAchieved);
        const targetCapacity = scenarios.find(s => s.gapAnalysis)?.gapAnalysis?.target;

        const scenarioCards = scenarios.map((scenario, index) => {
            const result = scenario.result || this.calculateCapacity(scenario.parameters);
            const currentCapacity = this.conversationState.lastResult?.newImplCapacity || 0;
            const increase = Math.round(((result.newImplCapacity - currentCapacity) / (currentCapacity || 1)) * 100);

            // Enhanced display for target-focused scenarios
            let targetStatusClass = '';
            let targetStatusText = '';
            let gapAnalysisText = '';

            if (scenario.gapAnalysis) {
                const gap = scenario.gapAnalysis;
                if (gap.target) {
                    if (result.newImplCapacity >= gap.target) {
                        targetStatusClass = 'target-achieved';
                        const surplus = result.newImplCapacity - gap.target;
                        targetStatusText = `🎯 Target Achieved${surplus > 0 ? ` (+${surplus} buffer)` : ''}`;
                    } else {
                        const shortfall = gap.target - result.newImplCapacity;
                        targetStatusClass = 'target-missed';
                        targetStatusText = `⚠️ ${shortfall} short of target`;
                    }
                    gapAnalysisText = `<div class="scenario-gap-analysis">Target: ${gap.target} | Current: ${gap.current} | This scenario: ${result.newImplCapacity}</div>`;
                }
            }

            const feasibilityColor = scenario.feasibility === 'High' ? '#48bb78' :
                                   scenario.feasibility === 'Medium' ? '#ed8936' : '#e53e3e';

            return `
                <div class="scenario-card ${targetStatusClass}" data-scenario-priority="${scenario.priority || 999}">
                    <div class="scenario-header">
                        <div class="scenario-name">${scenario.name}</div>
                        <div class="scenario-feasibility" style="color: ${feasibilityColor}">
                            ${scenario.feasibility} Feasibility
                        </div>
                    </div>
                    ${targetStatusText ? `<div class="scenario-target-status ${targetStatusClass}">${targetStatusText}</div>` : ''}
                    <div class="scenario-result">
                        <div class="scenario-capacity">${result.newImplCapacity}</div>
                        <div class="scenario-capacity-label">implementations</div>
                        ${increase > 0 ? `<div class="scenario-increase">+${increase}% from current</div>` : ''}
                    </div>
                    ${gapAnalysisText}
                    <div class="scenario-changes">
                        ${scenario.changes.map(change => `<span class="change-tag">${change}</span>`).join('')}
                    </div>
                    ${scenario.targetAchieved ?
                        `<div class="scenario-note">✅ Already meeting target - no changes needed</div>` :
                        `<button class="scenario-apply-btn" onclick="capacityBot.applyScenarioWithAllocation('${JSON.stringify(scenario.parameters).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', ${scenario.customAllocation ? "'" + JSON.stringify(scenario.customAllocation).replace(/'/g, '\\\'').replace(/"/g, '&quot;') + "'" : 'null'})">
                            Apply This Scenario
                        </button>`
                    }
                </div>
            `;
        }).join('');

        // Dynamic header based on scenario type
        let headerTitle, headerDescription;
        if (hasTargetFocused && targetCapacity) {
            headerTitle = `🎯 Target Achievement Scenarios`;
            headerDescription = `Pathways to reach your target of ${targetCapacity} implementations`;
        } else {
            headerTitle = `🔮 What-If Scenarios`;
            headerDescription = `Explore different scenarios to optimize your capacity`;
        }

        return `
            <div class="scenarios-container ${hasTargetFocused ? 'target-focused' : ''}">
                <div class="scenarios-header">
                    <h3>${headerTitle}</h3>
                    <p>${headerDescription}</p>
                </div>
                <div class="scenarios-grid">
                    ${scenarioCards}
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

    loadConversationState() {
        try {
            const saved = localStorage.getItem('capacityForecastState');
            if (saved) {
                const state = JSON.parse(saved);
                this.conversationState = { ...this.conversationState, ...state };

                // Restore last known parameters if available
                if (state.currentParameters && Object.values(state.currentParameters).some(v => v !== null)) {
                    this.currentSession = { ...this.currentSession, ...state.currentParameters };
                }
            }
        } catch (error) {
            console.warn('Could not load conversation state:', error);
        }
    }

    saveConversationState() {
        try {
            // Update current parameters in conversation state
            this.conversationState.currentParameters = { ...this.currentSession };

            // Save to localStorage (limit size to prevent quota issues)
            const stateToSave = {
                ...this.conversationState,
                history: this.conversationState.history.slice(-20), // Keep last 20 entries
                conversationContext: this.conversationState.conversationContext.slice(-10)
            };

            localStorage.setItem('capacityForecastState', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Could not save conversation state:', error);
        }
    }

    addToConversationHistory(userInput, botResponse, parameters, result) {
        const entry = {
            timestamp: new Date().toISOString(),
            userInput,
            botResponse,
            parameters: { ...parameters },
            result: result ? { ...result } : null,
            id: Date.now() + Math.random()
        };

        this.conversationState.history.push(entry);
        this.conversationState.conversationContext.push({
            role: 'user',
            content: userInput,
            timestamp: entry.timestamp
        });

        if (botResponse) {
            this.conversationState.conversationContext.push({
                role: 'assistant',
                content: botResponse,
                timestamp: entry.timestamp
            });
        }

        this.saveConversationState();
    }

    trackParameterChange(parameterName, oldValue, newValue, reason) {
        const change = {
            timestamp: new Date().toISOString(),
            parameter: parameterName,
            oldValue,
            newValue,
            reason,
            id: Date.now() + Math.random()
        };

        this.conversationState.parameterHistory.push(change);
        this.saveConversationState();
    }

    // Enhanced NLP Parser for conversational adjustments
    parseConversationalInput(message, currentContext) {
        const lowerMessage = message.toLowerCase();
        const adjustments = {};
        let intent = null;
        let isAdjustment = false;

        // Staff adjustment patterns
        const staffPatterns = [
            /(?:add|hire|get|need)\s+(\d+)\s+(?:more\s+)?(?:staff|people|team|members|workers)/,
            /(?:remove|fire|lose|cut)\s+(\d+)\s+(?:staff|people|team|members|workers)/,
            /(?:change|set|make)\s+(?:staff|team)\s+(?:to|count|size)?\s*(\d+)/,
            /(\d+)\s+(?:staff|people|team|members|workers)/,
            /(?:staff|team)\s+(?:of|count|size)?\s*(\d+)/
        ];

        for (const pattern of staffPatterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                const value = parseInt(match[1]);
                if (lowerMessage.includes('add') || lowerMessage.includes('hire') || lowerMessage.includes('more')) {
                    adjustments.staffCount = (currentContext.staffCount || 0) + value;
                    intent = `add ${value} staff members`;
                } else if (lowerMessage.includes('remove') || lowerMessage.includes('cut') || lowerMessage.includes('fire')) {
                    adjustments.staffCount = Math.max(1, (currentContext.staffCount || 0) - value);
                    intent = `remove ${value} staff members`;
                } else {
                    adjustments.staffCount = value;
                    intent = `set staff count to ${value}`;
                }
                isAdjustment = true;
                break;
            }
        }

        // Availability patterns
        const availabilityPatterns = [
            /(?:change|set|make)\s+(?:availability|available)\s+(?:to|at)?\s*(\d+)%?/,
            /(\d+)%?\s+(?:availability|available)/,
            /(?:availability|available)\s+(?:of|at|to)?\s*(\d+)%?/,
            /(?:improve|increase|boost)\s+(?:availability|available)\s+(?:to|by)?\s*(\d+)%?/
        ];

        for (const pattern of availabilityPatterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                let value = parseInt(match[1]);
                if (value > 1) value = value / 100; // Convert percentage to decimal
                adjustments.availabilityRatio = Math.min(0.95, Math.max(0.1, value));
                intent = `set availability to ${Math.round(adjustments.availabilityRatio * 100)}%`;
                isAdjustment = true;
                break;
            }
        }

        // Implementation time patterns
        const timePatterns = [
            /(?:change|set|make)\s+(?:implementation|task|avg|average)\s+(?:time|duration)\s+(?:to|at)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|h)?/,
            /(?:implementation|task|avg|average)\s+(?:time|duration)\s+(?:of|at|to)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|h)?/,
            /(\d+(?:\.\d+)?)\s*(?:hours?|h)\s+(?:per|each|for)\s+(?:task|implementation)/,
            /(?:reduce|decrease|cut)\s+(?:implementation|task)\s+(?:time|duration)\s+(?:by|to)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|h)?/,
            /(?:improve|speed up|faster)\s+(?:by|to)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|h)?/
        ];

        for (const pattern of timePatterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                let value = parseFloat(match[1]);
                if (lowerMessage.includes('reduce') || lowerMessage.includes('decrease') || lowerMessage.includes('cut')) {
                    value = Math.max(0.5, (currentContext.avgImplementationTime || 2) - value);
                    intent = `reduce implementation time by ${match[1]} hours`;
                } else if (lowerMessage.includes('improve') || lowerMessage.includes('speed') || lowerMessage.includes('faster')) {
                    value = Math.max(0.5, (currentContext.avgImplementationTime || 2) - value);
                    intent = `improve speed by ${match[1]} hours`;
                } else {
                    intent = `set implementation time to ${value} hours`;
                }
                adjustments.avgImplementationTime = value;
                isAdjustment = true;
                break;
            }
        }

        // Enhanced Goal/target patterns with better KPI detection
        const relativeTargetPatterns = [
            /(?:need|want|get|add)\s+(\d+)\s+(?:more|additional|extra)\s+(?:tasks|implementations)/,
            /(\d+)\s+(?:more|additional|extra)\s+(?:tasks|implementations)/,
            /(?:increase|boost|add)\s+(?:by\s+)?(\d+)\s+(?:tasks|implementations)/,
            /(?:need|want)\s+(?:at least\s+)?(\d+)\s+(?:more|additional)\s+(?:tasks|implementations)/
        ];

        const absoluteTargetPatterns = [
            /(?:reach|achieve|get to|target|goal of)\s+(\d+)\s+(?:tasks|implementations)/,
            /(?:need|want|target)\s+(\d+)\s+(?:tasks|implementations)\s+(?:total|in total|altogether)/,
            /(\d+)\s+(?:tasks|implementations)\s+(?:total|in total|altogether)/,
            /(?:need|want|target|goal)\s+(?:exactly\s+)?(\d+)\s+(?:tasks|implementations)(?!\s+more)/,
            /(?:capacity|goal)\s+(?:of\s+)?(\d+)\s+(?:tasks|implementations)/,
            /(\d+)\s+(?:tasks|implementations)\s+(?:minimum|min|at least|needed|required)$/
        ];

        // Check for relative targets first (X more tasks)
        for (const pattern of relativeTargetPatterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                const additionalTasks = parseInt(match[1]);
                const currentCapacity = this.conversationState.lastResult?.newImplCapacity || 0;
                adjustments.targetCapacity = currentCapacity + additionalTasks;
                adjustments.isRelativeTarget = true;
                adjustments.additionalTasks = additionalTasks;
                adjustments.currentCapacity = currentCapacity;
                intent = `achieve ${adjustments.targetCapacity} total implementations (${additionalTasks} more than current ${currentCapacity})`;
                isAdjustment = true;
                break;
            }
        }

        // Check for absolute targets if no relative target found
        if (!isAdjustment) {
            for (const pattern of absoluteTargetPatterns) {
                const match = lowerMessage.match(pattern);
                if (match) {
                    const targetTasks = parseInt(match[1]);
                    const currentCapacity = this.conversationState.lastResult?.newImplCapacity || 0;
                    adjustments.targetCapacity = targetTasks;
                    adjustments.isRelativeTarget = false;
                    adjustments.currentCapacity = currentCapacity;
                    adjustments.gapToTarget = targetTasks - currentCapacity;
                    intent = `achieve ${targetTasks} total implementations (${adjustments.gapToTarget > 0 ? `need ${adjustments.gapToTarget} more` : `${Math.abs(adjustments.gapToTarget)} above current`})`;
                    isAdjustment = true;
                    break;
                }
            }
        }

        // General analysis and improvement patterns
        const analysisPatterns = [
            /(?:how can i|how do i|how to|what if|what about|should i|could i)/i,
            /(?:improve|increase|boost|enhance|optimize|better|higher)/i,
            /(?:reduce|decrease|lower|cut|minimize)/i,
            /(?:scenario|option|alternative|different|change|adjust)/i,
            /(?:recommend|suggest|advice|help|guidance)/i,
            /(?:analysis|analyze|review|evaluate|assess)/i,
            /(?:compare|comparison|versus|vs|against)/i,
            /(?:feasible|possible|realistic|achievable)/i,
            /(?:budget|cost|expensive|affordable|cheap)/i,
            /(?:time|timeline|schedule|deadline|urgent)/i
        ];

        const isAnalysisQuery = analysisPatterns.some(pattern => pattern.test(lowerMessage));

        // If it's any kind of analysis query, treat as adjustment to trigger enhanced display
        if (isAnalysisQuery && !isAdjustment) {
            isAdjustment = true;
            intent = 'analyze current forecast';
        }

        // Dissatisfaction patterns
        const dissatisfactionPatterns = [
            /(?:too low|not enough|insufficient|need more|too few)/,
            /(?:can we do better|improve|increase|boost)/,
            /(?:disappointing|low|poor)/
        ];

        const isSatisfactionQuery = dissatisfactionPatterns.some(pattern => pattern.test(lowerMessage));

        // Comparison patterns
        const comparisonPatterns = [
            /(?:what if|compare|vs|versus|against)/,
            /(?:instead|alternative|different)/,
            /(?:scenario|option|case)/
        ];

        const isComparisonQuery = comparisonPatterns.some(pattern => pattern.test(lowerMessage));

        return {
            adjustments,
            intent,
            isAdjustment,
            isSatisfactionQuery,
            isComparisonQuery,
            confidence: isAdjustment ? 0.8 : 0.3,
            originalMessage: message
        };
    }

    // Scenario Planning Engine
    generateScenarios(baseParameters, targetCapacity = null) {
        const scenarios = [];
        const baseResult = this.calculateCapacity(baseParameters);

        // If user has a target, prioritize target-focused scenarios
        if (targetCapacity) {
            const targetScenarios = this.generateTargetScenarios(baseParameters, targetCapacity);
            scenarios.push(...targetScenarios);

            // Only add a few general improvement scenarios if we don't have enough target scenarios
            if (targetScenarios.length < 4) {
                const improvementScenarios = this.generateImprovementScenarios(baseParameters, baseResult);
                // Add only the top 2 improvement scenarios to complement target scenarios
                scenarios.push(...improvementScenarios.slice(0, 2));
            }

            // Sort target-focused scenarios by priority (target achievement first, then feasibility)
            return scenarios
                .sort((a, b) => {
                    // Prioritize scenarios that achieve the target
                    if (a.targetAchieved && !b.targetAchieved) return -1;
                    if (!a.targetAchieved && b.targetAchieved) return 1;

                    // Then by how close they get to target
                    if (a.result && b.result && targetCapacity) {
                        const aDistance = Math.abs(a.result.newImplCapacity - targetCapacity);
                        const bDistance = Math.abs(b.result.newImplCapacity - targetCapacity);
                        if (aDistance !== bDistance) return aDistance - bDistance;
                    }

                    // Finally by priority
                    return (a.priority || 999) - (b.priority || 999);
                })
                .slice(0, 3);
        }

        // No target specified - generate general improvement scenarios
        scenarios.push(...this.generateImprovementScenarios(baseParameters, baseResult));
        scenarios.push(...this.generateConstraintScenarios(baseParameters));

        return scenarios.slice(0, 3); // Limit to top 3 scenarios
    }

    generateTargetScenarios(baseParams, targetCapacity) {
        const scenarios = [];
        const currentResult = this.calculateCapacity(baseParams);
        const currentCapacity = currentResult.newImplCapacity;

        if (currentCapacity >= targetCapacity) {
            // Already meeting or exceeding target
            return [{
                name: `Target Already Achieved`,
                parameters: baseParams,
                result: currentResult,
                changes: ['No changes needed'],
                feasibility: 'High',
                priority: 0,
                targetAchieved: true,
                gapAnalysis: {
                    current: currentCapacity,
                    target: targetCapacity,
                    surplus: currentCapacity - targetCapacity
                }
            }];
        }

        const neededIncrease = targetCapacity - currentCapacity;
        const workingDays = this.calculateWorkingDays(baseParams.timeWindow);
        const hoursPerPerson = workingDays * 8 * baseParams.availabilityRatio * this.capacityAllocation.newImplementation;

        // Calculate all possible single-variable changes
        const singleVariableOptions = [];

        // Option A: Resource Allocation (HIGHEST PRIORITY - Revenue-focused, no extra costs)
        const currentNewImplAllocation = this.capacityAllocation.newImplementation;
        const currentUpdateAllocation = this.capacityAllocation.updateRequest;
        const requiredNewImplAllocation = (targetCapacity * baseParams.avgImplementationTime) / (workingDays * 8 * baseParams.availabilityRatio * baseParams.staffCount);
        const requiredUpdateAllocation = 1 - requiredNewImplAllocation;

        if (requiredNewImplAllocation > currentNewImplAllocation &&
            requiredNewImplAllocation <= 0.85 &&
            requiredUpdateAllocation >= 0.15) {

            const originalAllocation = this.capacityAllocation;
            this.capacityAllocation = {
                newImplementation: requiredNewImplAllocation,
                updateRequest: requiredUpdateAllocation
            };
            const allocationResult = this.calculateCapacity(baseParams);
            this.capacityAllocation = originalAllocation;

            const allocationIncrease = Math.round((requiredNewImplAllocation - currentNewImplAllocation) * 100);
            const updateDecrease = Math.round((currentUpdateAllocation - requiredUpdateAllocation) * 100);

            singleVariableOptions.push({
                type: 'allocation',
                name: `Optimize Resource Allocation`,
                parameters: baseParams,
                result: allocationResult,
                changes: [`+${allocationIncrease}% to New Implementation`, `-${updateDecrease}% from Update Requests`],
                feasibility: updateDecrease <= 20 ? 'High' : (updateDecrease <= 35 ? 'Medium' : 'Low'),
                capacityGain: allocationResult.newImplCapacity - currentCapacity,
                priority: 1,
                businessImpact: 'High - Revenue-focused reallocation',
                customAllocation: {
                    newImplementation: requiredNewImplAllocation,
                    updateRequest: requiredUpdateAllocation
                }
            });
        }

        // Option B: Process Efficiency (SECOND PRIORITY - Operational improvement)
        const requiredTimeReduction = baseParams.avgImplementationTime * (1 - currentCapacity / targetCapacity);
        const targetTime = baseParams.avgImplementationTime - requiredTimeReduction;
        if (targetTime >= 0.5 && requiredTimeReduction <= 4) {
            const efficiencyScenario = { ...baseParams, avgImplementationTime: targetTime };
            const efficiencyResult = this.calculateCapacity(efficiencyScenario);
            singleVariableOptions.push({
                type: 'efficiency',
                name: `Improve Process Efficiency`,
                parameters: efficiencyScenario,
                result: efficiencyResult,
                changes: [`-${requiredTimeReduction.toFixed(1)}h per task (${Math.round((requiredTimeReduction/baseParams.avgImplementationTime)*100)}% improvement)`],
                feasibility: this.calculateScenarioFeasibility('time', requiredTimeReduction, baseParams),
                capacityGain: efficiencyResult.newImplCapacity - currentCapacity,
                priority: 2,
                businessImpact: 'Medium - Process optimization'
            });
        }

        // Option C: Productivity Optimization (THIRD PRIORITY - Resource optimization)
        const requiredAvailability = baseParams.availabilityRatio * targetCapacity / currentCapacity;
        const availabilityIncrease = requiredAvailability - baseParams.availabilityRatio;
        if (requiredAvailability <= 0.90 && availabilityIncrease <= 0.25) {
            const availabilityScenario = { ...baseParams, availabilityRatio: requiredAvailability };
            const availabilityResult = this.calculateCapacity(availabilityScenario);
            singleVariableOptions.push({
                type: 'availability',
                name: `Optimize Team Productivity`,
                parameters: availabilityScenario,
                result: availabilityResult,
                changes: [`+${Math.round(availabilityIncrease * 100)}% productive time (reduce overhead)`],
                feasibility: this.calculateScenarioFeasibility('availability', availabilityIncrease, baseParams),
                capacityGain: availabilityResult.newImplCapacity - currentCapacity,
                priority: 3,
                businessImpact: 'Medium - Productivity optimization'
            });
        }

        // Option D: Team Expansion (LAST RESORT - Only for realistic targets)
        const exactStaffNeeded = neededIncrease * baseParams.avgImplementationTime / hoursPerPerson;
        const staffNeeded = Math.ceil(exactStaffNeeded);
        const gapPercentage = Math.round((neededIncrease / currentCapacity) * 100);

        // Only suggest hiring if gap is reasonable (<50%) and other options aren't sufficient
        if (staffNeeded <= 8 && gapPercentage <= 50) {
            const staffScenario = { ...baseParams, staffCount: baseParams.staffCount + staffNeeded };
            const staffResult = this.calculateCapacity(staffScenario);
            singleVariableOptions.push({
                type: 'staff',
                name: `Expand Team Strategically`,
                parameters: staffScenario,
                result: staffResult,
                changes: [`+${staffNeeded} team member${staffNeeded > 1 ? 's' : ''} (${Math.round((staffNeeded/baseParams.staffCount)*100)}% increase)`],
                feasibility: this.calculateScenarioFeasibility('staff', staffNeeded, baseParams),
                capacityGain: staffResult.newImplCapacity - currentCapacity,
                priority: 4,
                businessImpact: 'Low - Requires budget allocation'
            });
        }


        // Scenario 1: Highest single variable change that returns highest capacity
        const bestSingleOption = singleVariableOptions
            .filter(option => option.result.newImplCapacity >= targetCapacity)
            .sort((a, b) => b.capacityGain - a.capacityGain)[0];

        if (bestSingleOption) {
            scenarios.push({
                ...bestSingleOption,
                priority: 1,
                targetFocused: true,
                gapAnalysis: {
                    current: currentCapacity,
                    target: targetCapacity,
                    projected: bestSingleOption.result.newImplCapacity,
                    approach: bestSingleOption.type
                }
            });
        }

        // Scenarios 2 & 3: Combined business-focused solutions that prioritize operational improvements

        // Combined Option 1: Resource Allocation + Process Efficiency (revenue-focused approach)
        const bestBusinessApproach = singleVariableOptions.find(option =>
            option.type === 'allocation' || option.type === 'efficiency'
        );

        if (bestBusinessApproach) {
            // Try allocation + efficiency combination
            let allocationBoost = 0;
            let efficiencyBoost = 0;

            // Get partial benefits from both approaches
            if (bestBusinessApproach.type === 'allocation') {
                allocationBoost = 0.7; // 70% of allocation improvement
                efficiencyBoost = 0.3; // 30% efficiency improvement
            } else {
                allocationBoost = 0.4; // 40% allocation improvement
                efficiencyBoost = 0.6; // 60% efficiency improvement
            }

            // Calculate combined scenario parameters
            let combinedAllocation = null;
            let combinedEfficiency = baseParams.avgImplementationTime;

            // Apply allocation optimization if viable
            const currentNewImplAllocation = this.capacityAllocation.newImplementation;
            const maxAllocationIncrease = Math.min(0.85 - currentNewImplAllocation, 0.2); // Cap at 20% increase
            if (maxAllocationIncrease > 0) {
                const allocationIncrease = maxAllocationIncrease * allocationBoost;
                combinedAllocation = {
                    newImplementation: currentNewImplAllocation + allocationIncrease,
                    updateRequest: this.capacityAllocation.updateRequest - allocationIncrease
                };
            }

            // Apply efficiency improvement
            const maxEfficiencyGain = Math.min(baseParams.avgImplementationTime - 0.5, 2); // Cap at 2h reduction
            if (maxEfficiencyGain > 0) {
                const efficiencyReduction = maxEfficiencyGain * efficiencyBoost;
                combinedEfficiency = baseParams.avgImplementationTime - efficiencyReduction;
            }

            // Calculate result with combined approach
            const originalAllocation = this.capacityAllocation;
            if (combinedAllocation) {
                this.capacityAllocation = combinedAllocation;
            }

            const combinedScenario1 = {
                ...baseParams,
                avgImplementationTime: combinedEfficiency
            };
            const combinedResult1 = this.calculateCapacity(combinedScenario1);

            // Restore original allocation
            this.capacityAllocation = originalAllocation;

            const changes = [];
            if (combinedAllocation) {
                const allocIncrease = Math.round((combinedAllocation.newImplementation - currentNewImplAllocation) * 100);
                changes.push(`+${allocIncrease}% to revenue-generating work`);
            }
            if (combinedEfficiency < baseParams.avgImplementationTime) {
                const timeReduction = baseParams.avgImplementationTime - combinedEfficiency;
                changes.push(`-${timeReduction.toFixed(1)}h per task`);
            }

            scenarios.push({
                name: `Business Process Optimization`,
                parameters: combinedScenario1,
                result: combinedResult1,
                changes: changes,
                feasibility: 'High',
                priority: 2,
                targetFocused: true,
                businessImpact: 'High - Operational efficiency without additional costs',
                customAllocation: combinedAllocation,
                gapAnalysis: {
                    current: currentCapacity,
                    target: targetCapacity,
                    projected: combinedResult1.newImplCapacity,
                    approach: 'business_optimization'
                }
            });
        }

        // Combined Option 2: Process Efficiency + Productivity Optimization (holistic improvement)
        const efficiencyOptions = singleVariableOptions.filter(option =>
            option.type === 'efficiency' || option.type === 'availability'
        );

        if (efficiencyOptions.length >= 1) {
            // Apply moderate improvements to both efficiency and productivity
            const targetEfficiencyReduction = Math.min(1.5, baseParams.avgImplementationTime - 0.5); // Max 1.5h reduction
            const targetAvailabilityIncrease = Math.min(0.15, 0.85 - baseParams.availabilityRatio); // Max 15% increase

            const combinedScenario2 = {
                ...baseParams,
                avgImplementationTime: Math.max(0.5, baseParams.avgImplementationTime - targetEfficiencyReduction),
                availabilityRatio: Math.min(0.85, baseParams.availabilityRatio + targetAvailabilityIncrease)
            };
            const combinedResult2 = this.calculateCapacity(combinedScenario2);

            const changes = [];
            if (targetEfficiencyReduction > 0) {
                changes.push(`-${targetEfficiencyReduction.toFixed(1)}h per task (process improvement)`);
            }
            if (targetAvailabilityIncrease > 0) {
                changes.push(`+${Math.round(targetAvailabilityIncrease * 100)}% productive time (overhead reduction)`);
            }

            scenarios.push({
                name: `Comprehensive Process Improvement`,
                parameters: combinedScenario2,
                result: combinedResult2,
                changes: changes,
                feasibility: 'Medium',
                priority: 3,
                targetFocused: true,
                businessImpact: 'Medium - Sustainable operational improvements',
                gapAnalysis: {
                    current: currentCapacity,
                    target: targetCapacity,
                    projected: combinedResult2.newImplCapacity,
                    approach: 'holistic_improvement'
                }
            });
        }

        // If we have less than 3 scenarios and no single variable reaches target, add best approximations
        if (scenarios.length < 3) {
            const approximateOptions = singleVariableOptions
                .filter(option => !scenarios.some(s => s.name === option.name))
                .sort((a, b) => Math.abs(b.result.newImplCapacity - targetCapacity) - Math.abs(a.result.newImplCapacity - targetCapacity));

            for (const option of approximateOptions) {
                if (scenarios.length >= 3) break;
                scenarios.push({
                    ...option,
                    priority: scenarios.length + 1,
                    targetFocused: true,
                    gapAnalysis: {
                        current: currentCapacity,
                        target: targetCapacity,
                        projected: option.result.newImplCapacity,
                        approach: option.type
                    }
                });
            }
        }

        // Always return exactly 3 scenarios (or fewer if target is already achieved)
        return scenarios.slice(0, 3);
    }

    generateImprovementScenarios(baseParams, baseResult) {
        const scenarios = [];

        // Small staff increase
        const smallStaffIncrease = { ...baseParams, staffCount: baseParams.staffCount + 2 };
        const smallStaffResult = this.calculateCapacity(smallStaffIncrease);
        scenarios.push({
            name: 'Add 2 Team Members',
            parameters: smallStaffIncrease,
            result: smallStaffResult,
            changes: ['+2 staff members'],
            feasibility: 'High',
            priority: 4
        });

        // Efficiency improvement
        const efficiencyImprovement = { ...baseParams, avgImplementationTime: Math.max(0.5, baseParams.avgImplementationTime - 0.5) };
        const efficiencyResult = this.calculateCapacity(efficiencyImprovement);
        scenarios.push({
            name: 'Improve Efficiency by 0.5h',
            parameters: efficiencyImprovement,
            result: efficiencyResult,
            changes: ['-0.5h per task'],
            feasibility: 'Medium',
            priority: 5
        });

        // Availability boost
        const availabilityBoost = { ...baseParams, availabilityRatio: Math.min(0.95, baseParams.availabilityRatio + 0.1) };
        const availabilityResult = this.calculateCapacity(availabilityBoost);
        scenarios.push({
            name: 'Boost Availability by 10%',
            parameters: availabilityBoost,
            result: availabilityResult,
            changes: ['+10% availability'],
            feasibility: 'Medium',
            priority: 6
        });

        // Combined scenarios for more realistic solutions
        scenarios.push(...this.generateCombinedScenarios(baseParams, baseResult));

        return scenarios;
    }

    generateCombinedScenarios(baseParams, baseResult) {
        const combinedScenarios = [];

        // Scenario 1: Modest staff increase + small efficiency gain
        const modestCombined = {
            ...baseParams,
            staffCount: baseParams.staffCount + 1,
            avgImplementationTime: Math.max(0.5, baseParams.avgImplementationTime - 0.5)
        };
        const modestResult = this.calculateCapacity(modestCombined);
        combinedScenarios.push({
            name: 'Add 1 Staff + Improve Efficiency',
            parameters: modestCombined,
            result: modestResult,
            changes: ['+1 staff member', '-0.5h per task'],
            feasibility: this.calculateScenarioFeasibility('combined', 0, baseParams),
            priority: 7
        });

        // Scenario 2: Small staff increase + availability improvement
        const staffAvailabilityCombined = {
            ...baseParams,
            staffCount: baseParams.staffCount + 1,
            availabilityRatio: Math.min(0.90, baseParams.availabilityRatio + 0.05)
        };
        const staffAvailabilityResult = this.calculateCapacity(staffAvailabilityCombined);
        combinedScenarios.push({
            name: 'Add 1 Staff + 5% More Availability',
            parameters: staffAvailabilityCombined,
            result: staffAvailabilityResult,
            changes: ['+1 staff member', '+5% availability'],
            feasibility: this.calculateScenarioFeasibility('combined', 0, baseParams),
            priority: 8
        });

        // Scenario 3: Process improvement + availability optimization
        const processAvailabilityCombined = {
            ...baseParams,
            avgImplementationTime: Math.max(0.5, baseParams.avgImplementationTime * 0.85), // 15% reduction
            availabilityRatio: Math.min(0.90, baseParams.availabilityRatio + 0.05)
        };
        const processAvailabilityResult = this.calculateCapacity(processAvailabilityCombined);
        combinedScenarios.push({
            name: 'Process Optimization + Better Availability',
            parameters: processAvailabilityCombined,
            result: processAvailabilityResult,
            changes: ['-15% task time', '+5% availability'],
            feasibility: this.calculateScenarioFeasibility('combined', 0, baseParams),
            priority: 9
        });

        // Scenario 4: All-around improvement (moderate changes)
        const comprehensiveCombined = {
            ...baseParams,
            staffCount: baseParams.staffCount + 1,
            avgImplementationTime: Math.max(0.5, baseParams.avgImplementationTime * 0.9), // 10% reduction
            availabilityRatio: Math.min(0.88, baseParams.availabilityRatio + 0.03)
        };
        const comprehensiveResult = this.calculateCapacity(comprehensiveCombined);
        combinedScenarios.push({
            name: 'Comprehensive Improvement',
            parameters: comprehensiveCombined,
            result: comprehensiveResult,
            changes: ['+1 staff', '-10% task time', '+3% availability'],
            feasibility: this.calculateScenarioFeasibility('combined', 0, baseParams),
            priority: 10
        });

        return combinedScenarios;
    }

    generateConstraintScenarios(baseParams) {
        const scenarios = [];

        // Conservative scenario (slightly reduce expectations)
        const conservative = {
            ...baseParams,
            availabilityRatio: Math.max(0.6, baseParams.availabilityRatio - 0.05),
            avgImplementationTime: baseParams.avgImplementationTime + 0.3
        };
        const conservativeResult = this.calculateCapacity(conservative);
        scenarios.push({
            name: 'Conservative Estimate',
            parameters: conservative,
            result: conservativeResult,
            changes: ['-5% availability', '+0.3h per task'],
            feasibility: 'High',
            priority: 7
        });

        return scenarios;
    }

    // Sensitivity Analysis Engine
    performSensitivityAnalysis(baseParams) {
        const baseResult = this.calculateCapacity(baseParams);
        const sensitivity = {
            staff: this.calculateParameterSensitivity(baseParams, 'staffCount', baseResult.newImplCapacity),
            availability: this.calculateParameterSensitivity(baseParams, 'availabilityRatio', baseResult.newImplCapacity),
            avgImplTime: this.calculateParameterSensitivity(baseParams, 'avgImplementationTime', baseResult.newImplCapacity),
            mostSensitive: null,
            recommendations: []
        };

        // Find most sensitive parameter
        const sensitivities = [
            { param: 'staffCount', value: Math.abs(sensitivity.staff) },
            { param: 'availabilityRatio', value: Math.abs(sensitivity.availability) },
            { param: 'avgImplementationTime', value: Math.abs(sensitivity.avgImplTime) }
        ];

        sensitivity.mostSensitive = sensitivities.reduce((max, current) =>
            current.value > max.value ? current : max
        );

        // Generate recommendations based on sensitivity
        sensitivity.recommendations = this.generateSensitivityRecommendations(sensitivity);

        return sensitivity;
    }

    calculateParameterSensitivity(baseParams, paramName, baseCapacity) {
        const testParams = { ...baseParams };
        const changePercent = 0.1; // 10% change

        // Calculate capacity with 10% increase
        if (paramName === 'avgImplementationTime') {
            testParams[paramName] = baseParams[paramName] * (1 - changePercent); // Decrease time = increase capacity
        } else {
            testParams[paramName] = baseParams[paramName] * (1 + changePercent);
        }

        const newCapacity = this.calculateCapacity(testParams).newImplCapacity;

        // Return percentage change in capacity per 1% change in parameter
        return ((newCapacity - baseCapacity) / baseCapacity) / changePercent;
    }

    generateSensitivityRecommendations(sensitivity) {
        const recommendations = [];

        if (sensitivity.mostSensitive.param === 'staffCount' && sensitivity.staff > 0) {
            recommendations.push({
                type: 'hiring',
                message: `Adding staff has the highest impact. Each new team member increases capacity by ~${Math.round(sensitivity.staff * 10)}%`,
                priority: 'high'
            });
        }

        if (sensitivity.mostSensitive.param === 'availabilityRatio' && sensitivity.availability > 0) {
            recommendations.push({
                type: 'efficiency',
                message: `Improving availability has the highest impact. Reducing meetings/overhead by 10% increases capacity by ~${Math.round(sensitivity.availability * 10)}%`,
                priority: 'high'
            });
        }

        if (sensitivity.mostSensitive.param === 'avgImplementationTime' && sensitivity.avgImplTime > 0) {
            recommendations.push({
                type: 'process',
                message: `Process optimization has the highest impact. Reducing average task time by 10% increases capacity by ~${Math.round(Math.abs(sensitivity.avgImplTime) * 10)}%`,
                priority: 'high'
            });
        }

        return recommendations;
    }

    // Constraint Validation
    validateConstraints(parameters) {
        const constraints = {
            valid: true,
            warnings: [],
            errors: []
        };

        // Staff constraints
        if (parameters.staffCount < 1) {
            constraints.errors.push("Staff count must be at least 1");
            constraints.valid = false;
        } else if (parameters.staffCount > 100) {
            constraints.warnings.push("Staff count over 100 seems unusually high");
        }

        // Availability constraints
        if (parameters.availabilityRatio <= 0 || parameters.availabilityRatio > 1) {
            constraints.errors.push("Availability must be between 0 and 100%");
            constraints.valid = false;
        } else if (parameters.availabilityRatio < 0.5) {
            constraints.warnings.push("Availability below 50% indicates potential productivity issues");
        } else if (parameters.availabilityRatio > 0.95) {
            constraints.warnings.push("Availability above 95% may not account for breaks, meetings, and overhead");
        }

        // Implementation time constraints
        if (parameters.avgImplementationTime <= 0) {
            constraints.errors.push("Average implementation time must be greater than 0");
            constraints.valid = false;
        } else if (parameters.avgImplementationTime > 80) {
            constraints.warnings.push("Implementation time over 80 hours (2 weeks) seems unusually high");
        } else if (parameters.avgImplementationTime < 0.5) {
            constraints.warnings.push("Implementation time under 30 minutes seems unusually low");
        }

        return constraints;
    }

    // Enhanced Scenario Feasibility Calculation
    calculateScenarioFeasibility(type, changeValue, baseParams) {
        switch (type) {
            case 'staff':
                // Staff additions: Consider hiring time, budget impact, and scaling challenges
                if (changeValue <= 2) return 'High';
                if (changeValue <= 5) return 'Medium';
                return 'Low';

            case 'time':
                // Time reduction: Consider process improvement difficulty and current efficiency
                const currentTime = baseParams.avgImplementationTime;
                const reductionPercentage = (changeValue / currentTime) * 100;

                if (reductionPercentage <= 15) return 'High';    // Up to 15% reduction
                if (reductionPercentage <= 30) return 'Medium';  // 15-30% reduction
                return 'Low';                                    // >30% reduction

            case 'availability':
                // Availability increase: Consider current utilization and management overhead
                const currentAvailability = baseParams.availabilityRatio;
                const newAvailability = currentAvailability + changeValue;

                if (changeValue <= 0.05 && newAvailability <= 0.85) return 'High';  // 5% increase, max 85%
                if (changeValue <= 0.10 && newAvailability <= 0.90) return 'Medium'; // 10% increase, max 90%
                return 'Low';

            case 'combined':
                // For combined scenarios, take the lowest feasibility of all changes
                return 'Medium'; // Default for combined scenarios

            default:
                return 'Medium';
        }
    }

    calculateCapacity(parameters) {
        const workingDays = this.calculateWorkingDays(parameters.timeWindow);
        const totalHours = workingDays * 8 * parameters.staffCount;
        const availableHours = totalHours * parameters.availabilityRatio;
        const newImplHours = availableHours * this.capacityAllocation.newImplementation;
        const updateHours = availableHours * this.capacityAllocation.updateRequest;
        const newImplCapacity = Math.floor(newImplHours / parameters.avgImplementationTime);

        return {
            newImplCapacity,
            updateHours: Math.round(updateHours),
            workingDays,
            totalHours,
            availableHours: Math.round(availableHours),
            newImplHours: Math.round(newImplHours),
            availabilityPercent: Math.round(parameters.availabilityRatio * 100)
        };
    }

    compareScenarios(scenarios) {
        return scenarios
            .sort((a, b) => {
                // Sort by capacity (descending) then by feasibility then by priority
                if (b.result.newImplCapacity !== a.result.newImplCapacity) {
                    return b.result.newImplCapacity - a.result.newImplCapacity;
                }
                const feasibilityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                if (feasibilityOrder[b.feasibility] !== feasibilityOrder[a.feasibility]) {
                    return feasibilityOrder[b.feasibility] - feasibilityOrder[a.feasibility];
                }
                return a.priority - b.priority;
            });
    }

    async applyScenario(scenarioParametersJson) {
        try {
            const parameters = JSON.parse(scenarioParametersJson.replace(/&quot;/g, '"'));

            // Update current session with scenario parameters
            this.currentSession = {
                ...this.currentSession,
                ...parameters
            };

            // Store the applied scenario in conversation state
            this.conversationState.parameterHistory.push({
                timestamp: new Date().toISOString(),
                changes: parameters,
                source: 'scenario'
            });

            // Trigger recalculation with new parameters
            this.addMessage(`Applied scenario with updated parameters. Here's your new forecast:`, 'bot');
            await this.calculateAndDisplayForecast();

            this.saveConversationState();
        } catch (error) {
            console.error('Error applying scenario:', error);
            this.addMessage('Sorry, I had trouble applying that scenario. Please try again.', 'bot');
        }
    }

    async applyScenarioWithAllocation(scenarioParametersJson, allocationJson) {
        try {
            const parameters = JSON.parse(scenarioParametersJson.replace(/&quot;/g, '"'));
            const allocation = allocationJson && allocationJson !== 'null' ? JSON.parse(allocationJson.replace(/&quot;/g, '"')) : null;

            // Update current session with scenario parameters
            this.currentSession = {
                ...this.currentSession,
                ...parameters
            };

            // Update allocation if provided
            if (allocation) {
                this.capacityAllocation = {
                    newImplementation: allocation.newImplementation,
                    updateRequest: allocation.updateRequest
                };

                this.conversationState.parameterHistory.push({
                    timestamp: new Date().toISOString(),
                    changes: { ...parameters, allocation },
                    source: 'allocation_scenario'
                });

                this.addMessage(`Applied scenario with updated resource allocation (${Math.round(allocation.newImplementation * 100)}% New Implementation, ${Math.round(allocation.updateRequest * 100)}% Update Requests). Here's your new forecast:`, 'bot');
            } else {
                this.conversationState.parameterHistory.push({
                    timestamp: new Date().toISOString(),
                    changes: parameters,
                    source: 'scenario'
                });

                this.addMessage(`Applied scenario with updated parameters. Here's your new forecast:`, 'bot');
            }

            // Trigger recalculation with new parameters and allocation
            await this.calculateAndDisplayForecast();

        } catch (error) {
            console.error('Error applying scenario:', error);
            this.addMessage('Sorry, I had trouble applying that scenario. Please try again.', 'bot');
        }
    }

    toggleCalculationBreakdown() {
        const content = document.getElementById('calculationContent');
        const toggleButton = document.querySelector('.calculation-toggle');
        const toggleText = toggleButton.querySelector('.toggle-text');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');

        if (content && toggleButton) {
            const isHidden = content.classList.contains('calculation-hidden');

            if (isHidden) {
                // Show the breakdown
                content.classList.remove('calculation-hidden');
                toggleText.textContent = 'Hide Details';
                toggleIcon.textContent = '▼';
            } else {
                // Hide the breakdown
                content.classList.add('calculation-hidden');
                toggleText.textContent = 'Show Details';
                toggleIcon.textContent = '▶';
            }
        }
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
            // Wait for libraries to load and check with retry
            console.log('Checking PDF libraries...');

            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                console.log(`Attempt ${attempts + 1}: html2canvas available: ${typeof html2canvas !== 'undefined'}, jsPDF available: ${typeof window.jsPDF !== 'undefined'}`);

                if (typeof html2canvas !== 'undefined' && typeof window.jsPDF !== 'undefined') {
                    console.log('Both libraries loaded successfully');
                    break;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library not loaded after retries');
            }
            // Check if jsPDF is available in any form
            if (typeof window.jsPDF === 'undefined') {
                console.log('window.jsPDF not found, checking alternatives...');
                console.log('Available jsPDF-related properties:', Object.keys(window).filter(key => key.toLowerCase().includes('jspdf')));

                if (window.jspdf) {
                    console.log('Found window.jspdf, checking its structure...');
                    console.log('typeof window.jspdf:', typeof window.jspdf);
                    console.log('window.jspdf.jsPDF:', typeof window.jspdf.jsPDF);

                    // Check if it's the jsPDF constructor or has jsPDF property
                    if (typeof window.jspdf === 'function') {
                        console.log('window.jspdf is a function, setting as window.jsPDF');
                        window.jsPDF = window.jspdf;
                    } else if (window.jspdf.jsPDF && typeof window.jspdf.jsPDF === 'function') {
                        console.log('Found window.jspdf.jsPDF, setting as window.jsPDF');
                        window.jsPDF = window.jspdf.jsPDF;
                    } else {
                        console.log('window.jspdf found but no usable constructor');
                        window.jsPDF = null;
                    }
                } else {
                    console.log('No jsPDF library found, will use print fallback');
                    window.jsPDF = null;
                }
            }

            // Show loading indicator
            const downloadBtn = document.querySelector('.download-button');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '⏳ Generating PDF...';
            downloadBtn.disabled = true;

            // Try simple approach first - use existing dashboard with inline styles
            const pdfDocument = this.createSimplePDFFromDashboard(dashboard);

            // Add to DOM temporarily
            document.body.appendChild(pdfDocument);

            // Generate PDF
            const canvas = await html2canvas(pdfDocument, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 800,
                height: pdfDocument.scrollHeight
            });

            // Create PDF
            if (!window.jsPDF) {
                console.log('jsPDF not available, falling back to print dialog');
                document.body.removeChild(pdfDocument);
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
                window.print();
                return;
            }

            const pdf = new window.jsPDF('p', 'mm', 'a4');

            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Calculate scaling to fit page with margins
            const margin = 10;
            const availableWidth = pdfWidth - (margin * 2);
            const availableHeight = pdfHeight - (margin * 2);

            const imgAspectRatio = canvas.width / canvas.height;
            const pageAspectRatio = availableWidth / availableHeight;

            let renderWidth, renderHeight;

            if (imgAspectRatio > pageAspectRatio) {
                renderWidth = availableWidth;
                renderHeight = availableWidth / imgAspectRatio;
            } else {
                renderHeight = availableHeight;
                renderWidth = availableHeight * imgAspectRatio;
            }

            const x = (pdfWidth - renderWidth) / 2;
            const y = margin;

            pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);

            // Save PDF
            const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
            pdf.save(`capacity-forecast-${timestamp}.pdf`);

            // Clean up
            document.body.removeChild(pdfDocument);
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;

        } catch (error) {
            console.error('PDF generation failed:', error);

            // Clean up any temporary elements
            const tempDoc = document.querySelector('div[style*="position: fixed"][style*="-9999px"]');
            if (tempDoc) {
                document.body.removeChild(tempDoc);
            }

            // Restore button
            const downloadBtn = document.querySelector('.download-button');
            if (downloadBtn) {
                downloadBtn.innerHTML = '📄 Download PDF Report';
                downloadBtn.disabled = false;
            }

            // Show print fallback instead of just alert
            this.showPrintFallback(dashboard);
        }
    }

    createPDFDocument(originalDashboard) {
        try {
            console.log('Creating PDF document...');

            // Create container
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: -9999px;
                left: 0;
                width: 800px;
                background: white;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-sizing: border-box;
            `;

        // Add header
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 15px;">
                <h1 style="color: #667eea; margin: 0; font-size: 1.8rem; font-weight: 700;">Capacity Forecast Report</h1>
                <p style="color: #666; margin: 8px 0 0 0; font-size: 1rem;">Generated on ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
        `;

        // Get dashboard data from original
        const dashboardTitle = originalDashboard.querySelector('.dashboard-title')?.textContent || 'Capacity Forecast';
        const timePeriod = originalDashboard.querySelector('.time-period')?.textContent || '';
        const capacityNumber = originalDashboard.querySelector('.capacity-number')?.textContent || '0';

        // Extract metrics data
        const metricCards = originalDashboard.querySelectorAll('.metric-card');
        const metricsData = Array.from(metricCards).map(card => ({
            value: card.querySelector('.metric-value')?.textContent || '0',
            label: card.querySelector('.metric-label')?.textContent || ''
        }));

        // Extract task type data
        const newImplCard = originalDashboard.querySelector('.task-type-card.new-impl');
        const updateReqCard = originalDashboard.querySelector('.task-type-card.update-req');

        const newImplData = {
            capacity: newImplCard?.querySelector('.task-type-capacity')?.textContent || '0',
            percentage: newImplCard?.querySelector('.task-type-percentage')?.textContent || '65%',
            subtitle: newImplCard?.querySelector('.task-type-subtitle')?.textContent || ''
        };

        const updateReqData = {
            capacity: updateReqCard?.querySelector('.task-type-capacity')?.textContent || '0',
            percentage: updateReqCard?.querySelector('.task-type-percentage')?.textContent || '35%',
            subtitle: updateReqCard?.querySelector('.task-type-subtitle')?.textContent || ''
        };

        // Extract calculation steps
        const calculationSteps = originalDashboard.querySelectorAll('.calculation-step');
        const stepsData = Array.from(calculationSteps).map(step => ({
            description: step.querySelector('span:first-child')?.textContent || '',
            calculation: step.querySelector('span:last-child')?.textContent || ''
        }));

        // Build dashboard HTML with exact same structure
        const dashboardHTML = `
            <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; padding: 24px; margin: 0;">

                <!-- Dashboard Header -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 1.4rem; font-weight: 600; color: #2d3748; margin-bottom: 8px;">${dashboardTitle}</div>
                    <div style="font-size: 1.1rem; color: #667eea; font-weight: 500;">${timePeriod}</div>
                </div>

                <!-- Main Capacity Result -->
                <div style="text-align: center; margin: 24px 0;">
                    <div style="font-size: 3rem; font-weight: 700; color: #667eea; margin-bottom: 8px;">${capacityNumber}</div>
                    <div style="font-size: 1.1rem; color: #4a5568; font-weight: 500;">New Implementation Tasks</div>
                </div>

                <!-- Task Type Breakdown -->
                <div style="display: flex; gap: 16px; margin: 24px 0;">
                    <div style="flex: 1; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; padding: 20px; text-align: center; border-top: 4px solid #667eea;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-size: 1rem; font-weight: 600; color: #2d3748;">New Implementation</div>
                            <div style="font-size: 0.9rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: rgba(102, 126, 234, 0.1); color: #667eea;">${newImplData.percentage}</div>
                        </div>
                        <div style="font-size: 2.5rem; font-weight: 700; color: #2d3748; margin-bottom: 4px;">${newImplData.capacity}</div>
                        <div style="font-size: 0.9rem; color: #718096; font-weight: 500;">${newImplData.subtitle}</div>
                    </div>
                    <div style="flex: 1; background: linear-gradient(135deg, #48bb7815 0%, #38a16915 100%); border-radius: 12px; padding: 20px; text-align: center; border-top: 4px solid #48bb78;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-size: 1rem; font-weight: 600; color: #2d3748;">Update Request</div>
                            <div style="font-size: 0.9rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: rgba(72, 187, 120, 0.1); color: #48bb78;">${updateReqData.percentage}</div>
                        </div>
                        <div style="font-size: 2.5rem; font-weight: 700; color: #2d3748; margin-bottom: 4px;">${updateReqData.capacity}</div>
                        <div style="font-size: 0.9rem; color: #718096; font-weight: 500;">${updateReqData.subtitle}</div>
                    </div>
                </div>

                <!-- 4-Column Metrics -->
                <div style="margin: 24px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
                        ${metricsData.map(metric => `
                            <div style="background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                                <div style="font-size: 1.8rem; font-weight: 600; color: #2d3748; margin-bottom: 4px;">${metric.value}</div>
                                <div style="font-size: 0.9rem; color: #718096; font-weight: 500;">${metric.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Calculation Breakdown -->
                <div style="background: white; border-radius: 12px; padding: 20px; margin-top: 20px; border-left: 4px solid #667eea;">
                    <div style="font-size: 1.1rem; font-weight: 600; color: #2d3748; margin-bottom: 16px;">📊 Calculation Breakdown</div>
                    ${stepsData.map(step => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; line-height: 1.4;">
                            <span style="color: #4a5568;">${step.description}</span>
                            <span style="color: #2d3748; font-weight: 500;">${step.calculation}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

            container.innerHTML += dashboardHTML;
            console.log('PDF document created successfully');
            return container;

        } catch (error) {
            console.error('Error creating PDF document:', error);
            // Return a simple fallback version
            return this.createSimplePDFDocument(originalDashboard);
        }
    }

    createSimplePDFDocument(originalDashboard) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: -9999px;
            left: 0;
            width: 800px;
            background: white;
            padding: 20px;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        `;

        const dashboardTitle = originalDashboard.querySelector('.dashboard-title')?.textContent || 'Capacity Forecast';
        const timePeriod = originalDashboard.querySelector('.time-period')?.textContent || '';
        const capacityNumber = originalDashboard.querySelector('.capacity-number')?.textContent || '0';

        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 15px;">
                <h1 style="color: #667eea; margin: 0; font-size: 1.8rem;">Capacity Forecast Report</h1>
                <p style="color: #666; margin: 8px 0 0 0;">${new Date().toLocaleDateString()}</p>
            </div>
            <div style="background: #f5f7fa; border-radius: 12px; padding: 24px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2d3748; margin-bottom: 8px;">${dashboardTitle}</h2>
                    <p style="color: #667eea;">${timePeriod}</p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                    <div style="font-size: 3rem; font-weight: bold; color: #667eea;">${capacityNumber}</div>
                    <div style="color: #4a5568;">New Implementation Tasks</div>
                </div>
            </div>
        `;

        return container;
    }

    createSimplePDFFromDashboard(originalDashboard) {
        console.log('Creating simple PDF from existing dashboard...');

        // Create container
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: -9999px;
            left: 0;
            width: 800px;
            background: white;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-sizing: border-box;
        `;

        // Add simple header
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 15px;">
                <h1 style="color: #667eea; margin: 0; font-size: 1.8rem; font-weight: 700;">Capacity Forecast Report</h1>
                <p style="color: #666; margin: 8px 0 0 0; font-size: 1rem;">Generated on ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
        `;

        // Clone the dashboard and apply inline styles
        const dashboardClone = originalDashboard.cloneNode(true);

        // Remove action buttons
        const actionsDiv = dashboardClone.querySelector('.dashboard-actions');
        if (actionsDiv) {
            actionsDiv.remove();
        }

        // Remove toggle button
        const toggleButton = dashboardClone.querySelector('.calculation-toggle');
        if (toggleButton) {
            toggleButton.remove();
        }

        // Apply styles directly to elements
        dashboardClone.style.cssText = `
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 12px;
            padding: 24px;
            margin: 0;
            box-shadow: none;
        `;

        // Force metrics to 4-column layout
        const metricsRowTop = dashboardClone.querySelector('.metrics-row-top');
        if (metricsRowTop) {
            metricsRowTop.style.cssText = `
                display: grid !important;
                grid-template-columns: 1fr 1fr 1fr 1fr !important;
                gap: 12px !important;
                margin-bottom: 16px !important;
            `;
            console.log('Applied 4-column grid to metrics');
        }

        // Force calculation steps to 2-column layout
        const calculationSteps = dashboardClone.querySelectorAll('.calculation-step');
        calculationSteps.forEach(step => {
            step.style.cssText = `
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 8px 0 !important;
                border-bottom: 1px solid #e2e8f0 !important;
                font-size: 0.95rem !important;
            `;
        });
        console.log(`Applied 2-column layout to ${calculationSteps.length} calculation steps`);

        // Style metric cards
        const metricCards = dashboardClone.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            card.style.cssText = `
                background: white !important;
                border-radius: 12px !important;
                padding: 16px !important;
                text-align: center !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
                position: relative !important;
            `;
        });

        container.appendChild(dashboardClone);
        return container;
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
        const htmlContent = `
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
        `;

        printWindow.document.documentElement.innerHTML = htmlContent;

        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    // Google Gemini API Integration
    async setApiKey(apiKey) {
        if (!apiKey || !apiKey.trim()) {
            this.addMessage("Please provide a valid Google Gemini API key.", 'bot');
            return false;
        }

        this.aiConfig.geminiApiKey = apiKey.trim();
        this.aiConfig.enabled = true;
        localStorage.setItem('gemini_api_key', this.aiConfig.geminiApiKey);

        this.addMessage("✅ API key set successfully! AI enhancements are now enabled.", 'bot');
        console.log('🤖 AI enhancements enabled with Gemini API');
        return true;
    }

    async callGeminiAPI(prompt, context = {}) {
        if (!this.aiConfig.enabled || !this.aiConfig.geminiApiKey) {
            throw new Error('Gemini API not configured');
        }

        const url = `${this.aiConfig.apiEndpoint}${this.aiConfig.geminiModel}:generateContent?key=${this.aiConfig.geminiApiKey}`;

        const enhancedPrompt = this.buildGeminiPrompt(prompt, context);

        const requestBody = {
            contents: [{
                parts: [{
                    text: enhancedPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1000,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.aiConfig.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid API response format');
            }

            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            console.error('Gemini API error:', error);
            throw error;
        }
    }

    buildGeminiPrompt(userPrompt, context) {
        const systemContext = `You are an AI assistant helping with capacity forecasting for operations teams.

CONTEXT:
- Current parameters: ${JSON.stringify(context.currentParameters || {})}
- Last result: ${JSON.stringify(context.lastResult || {})}
- Conversation history: ${JSON.stringify(context.conversationContext?.slice(-3) || [])}

GUIDELINES:
- Focus on practical, actionable insights for operations management
- Consider industry best practices for team productivity
- Provide specific numerical recommendations when possible
- Be concise but thorough in explanations
- Acknowledge uncertainty when appropriate

USER REQUEST: ${userPrompt}

Please provide insights, recommendations, or analysis based on the context and request.`;

        return systemContext;
    }

    async generateAIInsights(parameters, result, targetCapacity = null) {
        // Always generate our custom business-focused insights based on specific considerations
        const insights = [];

        // AI Insight #1: KPI Feasibility vs Current Headcount Analysis (only if target exists)
        if (targetCapacity) {
            const kpiFeasibilityInsight = this.generateKPIFeasibilityInsight(parameters, result, targetCapacity);
            if (kpiFeasibilityInsight) {
                insights.push(kpiFeasibilityInsight);
            }
        }

        // AI Insight #2: Resource Allocation Analysis (Update Request vs New Implementation)
        const allocationInsight = this.generateAllocationInsight(parameters, result);
        insights.push(allocationInsight);

        // AI Insight #3: Implementation Time Efficiency Analysis
        const efficiencyInsight = this.generateEfficiencyInsight(parameters, result);
        insights.push(efficiencyInsight);

        // We now have exactly the 3 insights we want - no need for additional API calls
        // Our custom insights provide all the business-focused analysis needed

        return insights.slice(0, 3); // Always return exactly our 3 custom insights
    }

    generateKPIFeasibilityInsight(parameters, result, targetCapacity) {
        if (!targetCapacity) return null;

        const currentCapacity = result.newImplCapacity;
        const gap = targetCapacity - currentCapacity;
        const headcount = parameters.staffCount;
        const gapPercentage = Math.round((gap / currentCapacity) * 100);

        let feasibilityMessage;
        let recommendedAction;

        if (gap <= 0) {
            feasibilityMessage = `Your target of ${targetCapacity} implementations is already achieved (current: ${currentCapacity}).`;
            recommendedAction = "Consider optimizing resource allocation or setting stretch goals for additional revenue growth.";
        } else if (gapPercentage <= 15) {
            feasibilityMessage = `Your target of ${targetCapacity} implementations is realistic and achievable through operational improvements.`;
            recommendedAction = "Focus on process efficiency and resource reallocation rather than hiring additional staff.";
        } else if (gapPercentage <= 35) {
            feasibilityMessage = `Your target of ${targetCapacity} implementations is ambitious but achievable with strategic business improvements.`;
            recommendedAction = "Prioritize resource allocation optimization and process improvements before considering team expansion.";
        } else if (gapPercentage <= 60) {
            feasibilityMessage = `Your target of ${targetCapacity} implementations is challenging and may not be cost-effective to achieve in the near term.`;
            const moderateTarget = Math.round(currentCapacity * 1.25);
            recommendedAction = `Consider a more moderate target of ${moderateTarget} implementations (25% increase) as an initial milestone, achievable through business optimization.`;
        } else {
            feasibilityMessage = `Your target of ${targetCapacity} implementations is unrealistic with current resources and market constraints.`;
            const realisticTarget = Math.round(currentCapacity * 1.4);
            recommendedAction = `Recommend revising to ${realisticTarget} implementations (40% increase) as a stretch but achievable goal through comprehensive business improvements.`;
        }

        return {
            type: 'kpi_feasibility',
            message: `${feasibilityMessage} ${recommendedAction}`,
            source: 'business_analysis',
            timestamp: new Date().toISOString()
        };
    }

    generateAllocationInsight(parameters, result) {
        const updateHours = result.updateHours;
        const newImplHours = result.availableHours - updateHours;
        const updatePercentage = Math.round((updateHours / result.availableHours) * 100);
        const currentAllocation = Math.round(this.capacityAllocation.updateRequest * 100);

        let allocationMessage;
        let recommendation;

        if (updatePercentage >= 40) {
            allocationMessage = `Your team allocates ${updatePercentage}% (${updateHours}h) to Update Requests, which significantly limits revenue-generating New Implementation capacity.`;
            recommendation = `Consider reducing Update Request allocation from ${currentAllocation}% to 25% to unlock ${Math.round((currentAllocation - 25) * result.availableHours / 100)}h for revenue-generating work.`;
        } else if (updatePercentage >= 30) {
            allocationMessage = `Your current ${updatePercentage}% allocation (${updateHours}h) to Update Requests is substantial compared to revenue-generating New Implementation work.`;
            recommendation = `Reducing Update Request allocation by 10% could free up ${Math.round(result.availableHours * 0.1)}h for ${Math.round((result.availableHours * 0.1) / parameters.avgImplementationTime)} additional revenue-generating implementations.`;
        } else {
            allocationMessage = `Your ${updatePercentage}% allocation to Update Requests is well-balanced, prioritizing revenue-generating New Implementation work effectively.`;
            recommendation = "Consider maintaining this allocation ratio to maximize revenue potential while supporting existing implementations.";
        }

        return {
            type: 'resource_allocation',
            message: `${allocationMessage} ${recommendation}`,
            source: 'resource_optimization',
            timestamp: new Date().toISOString()
        };
    }

    generateEfficiencyInsight(parameters, result) {
        const avgTime = parameters.avgImplementationTime;
        const efficiencyLevel = this.assessEfficiencyLevel(avgTime);

        let efficiencyMessage;
        let improvement;

        switch (efficiencyLevel) {
            case 'excellent':
                efficiencyMessage = `Your average implementation time of ${avgTime}h is excellent, indicating highly efficient processes and skilled team execution.`;
                improvement = "Focus on knowledge sharing and documentation to maintain this efficiency as you scale.";
                break;
            case 'good':
                efficiencyMessage = `Your average implementation time of ${avgTime}h is competitive, with room for optimization through process improvements.`;
                improvement = `Reducing implementation time by 0.5-1h could increase capacity by ${Math.round((avgTime / (avgTime - 0.75) - 1) * 100)}% without additional resources.`;
                break;
            case 'average':
                efficiencyMessage = `Your average implementation time of ${avgTime}h indicates potential for significant efficiency gains through process optimization.`;
                improvement = `Implementing automation, templates, or training could reduce time by 1-2h, boosting capacity by ${Math.round((avgTime / (avgTime - 1.5) - 1) * 100)}%.`;
                break;
            case 'poor':
                efficiencyMessage = `Your average implementation time of ${avgTime}h suggests substantial inefficiencies that limit your team's capacity potential.`;
                improvement = `Urgent process review and optimization could reduce time by 2-4h, potentially doubling your implementation capacity.`;
                break;
        }

        return {
            type: 'efficiency_analysis',
            message: `${efficiencyMessage} ${improvement}`,
            source: 'process_optimization',
            timestamp: new Date().toISOString()
        };
    }

    assessEfficiencyLevel(avgImplementationTime) {
        if (avgImplementationTime <= 2) return 'excellent';
        if (avgImplementationTime <= 4) return 'good';
        if (avgImplementationTime <= 8) return 'average';
        return 'poor';
    }

    buildCustomGeminiPrompt(parameters, result, targetCapacity) {
        const basePrompt = `Analyze this capacity forecast for additional strategic insights:

Parameters:
- Team size: ${parameters.staffCount} people
- Time period: ${parameters.timeWindow}
- Availability: ${Math.round(parameters.availabilityRatio * 100)}%
- Avg implementation time: ${parameters.avgImplementationTime} hours

Results:
- New implementation capacity: ${result.newImplCapacity} tasks
- Update request hours: ${result.updateHours} hours
- Total available hours: ${result.availableHours} hours
${targetCapacity ? `- Target capacity: ${targetCapacity} implementations` : ''}

Provide 1 additional strategic insight focusing on industry benchmarks, team scaling considerations, or market competitiveness. Keep it concise (1-2 sentences).`;

        return basePrompt;
    }

    parseAIInsights(aiResponse) {
        // Parse AI response into structured insights with better formatting
        const lines = aiResponse.split('\n').filter(line => line.trim());
        const insights = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and section headers only
            if (!trimmed || trimmed.toLowerCase().includes('insights') || trimmed.toLowerCase().includes('analysis')) {
                continue;
            }

            // Clean up formatting but preserve the content
            let cleanMessage = trimmed
                .replace(/^#+\s*/, '') // Remove markdown headers
                .replace(/^\*+\s*/, '') // Remove asterisk bullets
                .replace(/^[-•]\s*/, '') // Remove dash/bullet points
                .replace(/^\d+\.\s*/, '') // Remove numbered lists
                .trim();

            if (cleanMessage) {
                insights.push({
                    type: 'ai_insight',
                    message: cleanMessage,
                    source: 'gemini',
                    timestamp: new Date().toISOString()
                });
            }
        }

        return insights.slice(0, 3); // Limit to 3 insights
    }

    async handleAIQuery(userMessage) {
        if (!this.aiConfig.enabled) {
            return "AI features are not enabled. To use AI insights, please set your Google Gemini API key by typing: 'set api key YOUR_API_KEY'";
        }

        try {
            const response = await this.callGeminiAPI(userMessage, {
                currentParameters: this.currentSession,
                lastResult: this.conversationState.lastResult,
                conversationContext: this.conversationState.conversationContext
            });

            return response;

        } catch (error) {
            console.error('AI query error:', error);
            return `I had trouble processing that request with AI. Error: ${error.message}`;
        }
    }

}

// Global variable to access bot instance
let capacityBot;

document.addEventListener('DOMContentLoaded', () => {
    capacityBot = new CapacityForecastBot();
});