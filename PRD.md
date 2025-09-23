# Product Requirements Document: Capacity Forecast Chatbot

## Problem Statement

Operations teams struggle to accurately forecast their capacity for upcoming periods, often relying on manual calculations or spreadsheets that don't account for real-world variables like availability ratios and task type distributions. This leads to unrealistic commitments, resource planning failures, and missed delivery targets.

## Target User

Operations managers and team leads who need to plan capacity for software development teams handling New Implementation tasks and Update Requests.

## Core Feature

The app provides instant capacity forecasting through a conversational chatbot interface that calculates team capacity based on staff count, availability ratios, working days, and task complexity.

## AI Integration

Gemini AI generates intelligent insights and recommendations based on forecast results, including feasibility analysis, optimization suggestions, and scenario planning. The AI also enables natural language processing for follow-up questions and conversational adjustments to forecasting parameters.

## Data Model

Currently client-side storage only (localStorage):
- Session parameters (staff count, availability ratio, implementation time, time window)
- Conversation history and context
- Scenario results and comparisons
- Parameter change tracking
- AI insights cache

*Note: No Supabase integration currently implemented - all data stored locally*

## Success Criteria

• Users can generate accurate capacity forecasts in under 2 minutes through natural conversation
• System provides actionable business insights and scenario recommendations that help optimize resource allocation
• Users can adjust parameters conversationally and receive updated forecasts without starting over