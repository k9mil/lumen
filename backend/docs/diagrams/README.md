# Lumen Backend Diagrams

This directory contains Mermaid diagrams documenting the Lumen backend architecture and pipeline.

## Files

| File | Description |
|------|-------------|
| [`01-system-architecture.md`](01-system-architecture.md) | High-level system overview showing all components |
| [`02-pipeline-flow.md`](02-pipeline-flow.md) | Step-by-step pipeline execution flow |
| [`03-sequence-diagram.md`](03-sequence-diagram.md) | Request lifecycle sequence diagram |
| [`04-agent-architecture.md`](04-agent-architecture.md) | Agent class hierarchy and relationships |
| [`05-scoring-algorithm.md`](05-scoring-algorithm.md) | Risk scoring algorithm details |

## Viewing Diagrams

### Option 1: GitHub
GitHub renders Mermaid diagrams natively. Simply open any `.md` file to see the diagram.

### Option 2: VS Code
Install the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension.

1. Open any `.md` file
2. Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux)
3. The diagram will render automatically

### Option 3: Mermaid Live Editor
Copy the mermaid code from any file and paste into [Mermaid Live Editor](https://mermaid.live/)

### Option 4: Command Line
Use the Mermaid CLI:

```bash
# Install
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i 01-system-architecture.md -o architecture.png

# Convert to SVG
mmdc -i 02-pipeline-flow.md -o pipeline.svg
```

## Quick Reference

### Pipeline Overview
- **11 steps** from start to finish
- **35 seconds** total execution time
- **4 parallel** data gathering steps
- **4 parallel** vision analysis passes
- **9 agents** working together

### Key Performance Numbers
| Metric | Value |
|--------|-------|
| Total Time | ~35 seconds |
| API Calls | 8 external APIs |
| AI Calls | 5 Gemini calls |
| Database Writes | 1 snapshot + N evidence items |
| Concurrent Limit | 5 pipelines max (semaphore) |

### Agent Breakdown
1. **GeocodeAgent** - Address → Coordinates
2. **CompaniesHouseAgent** - UK company data
3. **FoodHygieneAgent** - FSA ratings (free)
4. **CrimeAgent** - Police data (free)
5. **LicensingAgent** - Local licenses
6. **PlacesAgent** - Google Places
7. **StreetViewAgent** - 4 directional images
8. **VisionAgent** - AI image analysis (4 passes, parallel)
9. **ReviewSentimentAgent** - Review analysis
10. **ScoringAgent** - Risk calculation
11. **ChangeDetectionAgent** - Snapshot comparison

## Architecture Highlights

### Parallel Processing
```python
# Steps 2-5 run concurrently
tasks = [
    run_companies_house(),
    run_food_hygiene(),
    run_crime(),
    run_licensing()
]
results = await asyncio.gather(*tasks)
```

### Vision Parallel Passes
```python
# All 4 vision passes run simultaneously
pass_tasks = [
    run_general_pass(),
    run_signage_pass(),
    run_activity_pass(),
    run_condition_pass()
]
results = await asyncio.gather(*pass_tasks)
```

### JSON Mode for Reliability
```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=contents,
    config=types.GenerateContentConfig(
        response_mime_type="application/json"  # Forces valid JSON
    )
)
```

## Contributing

When adding new diagrams:
1. Use the naming convention: `XX-descriptive-name.md`
2. Include both the mermaid code and explanatory text
3. Add the file to the table above
4. Test rendering in GitHub or VS Code
