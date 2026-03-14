# Data Flow Sequence Diagram

Shows the complete request lifecycle from API call to database persistence.

```mermaid
sequenceDiagram
    actor User
    participant API as FastAPI
    participant PO as PipelineOrchestrator
    participant Agents as Agents
    participant External as External APIs
    participant DB as Database
    
    User->>API: POST /pipeline/buildings/1/run
    API->>DB: Get Building Data
    DB-->>API: Building {address, property_class}
    
    API->>PO: run_pipeline(building_id, address, ...)
    
    rect rgb(200, 255, 200)
        Note over PO,External: Step 1: Geocode (REQUIRED)
        PO->>Agents: GeocodeAgent
        Agents->>External: Google Geocoding API
        External-->>Agents: {lat, lng, place_id}
        Agents-->>PO: ✓ Coordinates
    end
    
    rect rgb(255, 255, 200)
        Note over PO,External: Steps 2-5: Parallel Data Gathering
        par Companies House
            PO->>Agents: CompaniesHouseAgent
            Agents->>External: UK API
            External-->>Agents: {companies, SIC codes}
            Agents-->>PO: ✓ Company Data
        and Food Hygiene
            PO->>Agents: FoodHygieneAgent
            Agents->>External: FSA API
            External-->>Agents: {rating, scores}
            Agents-->>PO: ✓ Hygiene Data
        and Crime Stats
            PO->>Agents: CrimeAgent
            Agents->>External: Police UK API
            External-->>Agents: {crimes, categories}
            Agents-->>PO: ✓ Crime Data
        and Licensing
            PO->>Agents: LicensingAgent
            Agents->>Agents: GeoJSON Lookup
            Agents-->>PO: ✓ License Data
        end
    end
    
    rect rgb(200, 200, 255)
        Note over PO,External: Steps 7-8: Images + AI
        PO->>Agents: StreetViewAgent
        Agents->>External: Google Street View
        External-->>Agents: [4 JPEG images]
        Agents-->>PO: ✓ 4 Images
        
        PO->>Agents: VisionAgent
        
        par Pass 1
            Agents->>External: Gemini - General
            External-->>Agents: {occupier_type, ...}
        and Pass 2
            Agents->>External: Gemini - Signage
            External-->>Agents: {all_signage, ...}
        and Pass 3
            Agents->>External: Gemini - Activity
            External-->>Agents: {people, vehicles, ...}
        and Pass 4
            Agents->>External: Gemini - Condition
            External-->>Agents: {maintenance, ...}
        end
        
        Agents->>Agents: Merge 4 results
        Agents-->>PO: ✓ Vision Analysis
    end
    
    PO->>Agents: ReviewSentimentAgent
    Agents->>External: Gemini (reviews)
    External-->>Agents: {sentiment, risk_signals}
    Agents-->>PO: ✓ Sentiment Analysis
    
    PO->>Agents: ScoringAgent
    Agents->>Agents: Calculate weighted score
    Agents-->>PO: ✓ Score: 67/100 (High)
    
    PO->>Agents: ChangeDetectionAgent
    Agents->>DB: Get previous snapshot
    DB-->>Agents: Previous data
    Agents->>Agents: Compare & detect changes
    Agents-->>PO: ✓ Material change: true
    
    PO->>DB: Create snapshot
    PO->>DB: Create evidence_items
    PO->>DB: Update building status
    
    DB-->>PO: ✓ Saved
    
    PO-->>API: PipelineResult {score, tier, evidence, ...}
    API-->>User: JSON Response
```

## Request Lifecycle

1. **User Request**: POST to `/api/pipeline/buildings/{id}/run`
2. **Building Lookup**: Fetch building from database
3. **Pipeline Execution**: 11-step orchestrated workflow
4. **Parallel Processing**: Steps 2-5 and Vision passes run concurrently
5. **External API Calls**: 8 different APIs called
6. **AI Analysis**: Gemini processes images and reviews
7. **Scoring**: Weighted algorithm calculates risk
8. **Persistence**: Results saved to 3 database tables
9. **Response**: JSON with score, tier, evidence, changes

## Database Operations

### Reads
- Building lookup (1 read)
- Previous snapshot for change detection (1 read)

### Writes
- New snapshot (1 insert)
- Evidence items (N inserts, one per signal)
- Building update (1 update)

Total: 3 reads, variable writes
