# Lumen System Architecture

High-level overview of the Lumen backend system showing how components interact.

```mermaid
graph TB
    subgraph "FastAPI Application"
        API[API Routes<br/>/api/pipeline/buildings/{id}/run]
        PS[PipelineService]
        PO[PipelineOrchestrator]
    end
    
    subgraph "Agent System"
        GA[GeocodeAgent]
        CHA[CompaniesHouseAgent]
        FHA[FoodHygieneAgent]
        CA[CrimeAgent]
        LA[LicensingAgent]
        PA[PlacesAgent]
        SVA[StreetViewAgent]
        VA[VisionAgent]
        RSA[ReviewSentimentAgent]
        SA[ScoringAgent]
        CDA[ChangeDetectionAgent]
    end
    
    subgraph "External APIs"
        GG[Google Maps<br/>Geocoding, Places,<br/>Street View]
        CH[Companies House<br/>UK API]
        FSA[FSA API<br/>Food Hygiene]
        POL[Police UK<br/>Crime Data]
        GEM[Gemini AI<br/>Vision + Text]
    end
    
    subgraph "Database"
        DB[(SQLite)]
        B[Buildings]
        S[Snapshots]
        EI[EvidenceItems]
    end
    
    API --> PS
    PS --> PO
    PO --> GA
    PO --> CHA
    PO --> FHA
    PO --> CA
    PO --> LA
    PO --> PA
    PO --> SVA
    PO --> VA
    PO --> RSA
    PO --> SA
    PO --> CDA
    
    GA --> GG
    CHA --> CH
    FHA --> FSA
    CA --> POL
    PA --> GG
    SVA --> GG
    VA --> GEM
    RSA --> GEM
    
    PO --> DB
    PS --> B
    PS --> S
    PS --> EI
```

## Components

### API Layer
- **Pipeline API Routes**: HTTP endpoints for triggering pipeline runs
- **PipelineService**: Business logic layer connecting API to agents
- **PipelineOrchestrator**: Coordinates the 11-step pipeline workflow

### Agent System (9 Agents)
1. **GeocodeAgent**: Converts addresses to coordinates
2. **CompaniesHouseAgent**: Fetches UK company registration data
3. **FoodHygieneAgent**: Gets FSA food safety ratings
4. **CrimeAgent**: Retrieves Police UK crime statistics
5. **LicensingAgent**: Checks local alcohol/entertainment licenses
6. **PlacesAgent**: Google Places business information
7. **StreetViewAgent**: Downloads 4-directional street view images
8. **VisionAgent**: AI analysis of images (4 parallel passes)
9. **ReviewSentimentAgent**: Analyzes Google reviews for risk signals
10. **ScoringAgent**: Calculates weighted risk scores
11. **ChangeDetectionAgent**: Compares snapshots for material changes

### External APIs
- **Google Maps**: Geocoding, Places, Street View Static
- **Companies House**: UK business registration data
- **FSA**: Food hygiene ratings (free, no key)
- **Police UK**: Crime statistics (free, no key)
- **Gemini AI**: Vision analysis and text processing

### Database
- **SQLite**: Lightweight, file-based database
- **Buildings**: Core property records
- **Snapshots**: Immutable pipeline run results
- **EvidenceItems**: Individual risk signals per snapshot
