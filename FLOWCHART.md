# Expert Twin System Flowcharts

This document visualizes the logical flows, data pipelines, and architecture of the **Expert Twin** platform, illustrating how manual inputs, file uploads (txt/md/pdf), server-side extraction, and LLM chat execution coordinate to simulate an AI twin.

## 1. Unified Architecture & Data Flow

This flowchart illustrates the end-to-end flow from the creator input phase to the real-time AI twin sandbox chat interface.

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#1e1e38,stroke:#7c3aed,stroke-width:2px,color:#fff;
    classDef backend fill:#111827,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef external fill:#1f2937,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef storage fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff;

    %% Creator Dashboard Node Group
    subgraph UI_Creator["Creator Dashboard (Frontend UI)"]
        A[Creator Dashboard Form]:::frontend
        B[Manual Sentence Inputs]:::frontend
        C[File Upload Zone .txt, .md, .pdf]:::frontend
    end

    %% Client State & Storage
    subgraph Client_State["Client State & Storage"]
        D[FileReader API txt/md]:::frontend
        E[Uploaded Files Registry]:::frontend
        F[LocalStorage State Persistence]:::storage
    end

    %% Backend Services
    subgraph Backend_Services["Next.js Server API Routes"]
        G["/api/extract-pdf (Route Handler)"]:::backend
        H["/api/chat (Route Handler)"]:::backend
    end

    %% External Systems
    subgraph External_LLM["AI Inference"]
        I[Groq Cloud API]:::external
    end

    %% Links & Flow
    A --> B
    A --> C
    
    %% Handling text files
    C -- "TXT / MD Files" --> D
    D --> E
    
    %% Handling PDF files
    C -- "PDF Files (FormData)" --> G
    G -- "Parsed Plain Text" --> E
    
    %% Manual compilation
    B --> E
    
    %% State Management
    E --> F
    F -.->|"Hydrate on Load"| A
    
    %% Chat Sandbox Execution
    F -->|"Aggregate Knowledge Base String"| J["Sandbox Chat Screen"]:::frontend
    J -->|"Send Prompt + History + Knowledge"| H
    H -->|"Format System Prompt + Invoke"| I
    I -->|"Stream/Return Text Response"| H
    H -->|"Update Chat History UI"| J
```

## 2. Server-side PDF Extraction Pipeline (`/api/extract-pdf`)

Here is the step-by-step pipeline mapping how a binary PDF file uploaded via a multi-part form is parsed securely on the server without local disk storage.

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Creator Dashboard (Client)
    participant API as Route Handler (/api/extract-pdf)
    participant Parser as PDF Parser (unpdf/pdf-parse)

    Creator->>API: POST multipart/form-data (file binary)
    note over API: Extract file object from request FormData
    API->>API: Read file as ArrayBuffer / Buffer
    
    alt Parsing Success
        API->>Parser: Parse Buffer content
        Parser-->>API: Extract raw text blocks
        API->>API: Strip control characters & format whitespace
        API-->>Creator: HTTP 200 OK (extracted text payload)
    else Parsing Failure / No File
        API-->>Creator: HTTP 400 Bad Request (Error message)
    end
```

## 3. Dynamic System Prompt Compilation & LLM Chat Flow

This diagram demonstrates how manual inputs and multi-file text are merged to form the context injector used by the LLM system prompt.

```mermaid
graph LR
    %% Styling
    classDef input fill:#1e1e38,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef process fill:#111827,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef output fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;

    %% Data Inputs
    In1[Manual Bio / Sentence Inputs]:::input
    In2[Local FileReader Text txt/md]:::input
    In3[Parsed PDF Text Content]:::input

    %% Processing
    Proc1{Concat String Builder}:::process
    Proc2[Inject System Prompt Template]:::process
    Proc3[Combine Chat History Messages]:::process
    
    %% Execution
    Exec[Invoke Llama 3.3 model via Groq API]:::process
    Out[Render Assistant Bubble in Chat Sandbox]:::output

    %% Interconnections
    In1 --> Proc1
    In2 --> Proc1
    In3 --> Proc1
    
    Proc1 -->|"Combined Knowledge base String"| Proc2
    Proc2 --> Proc3
    Proc3 --> Exec
    Exec --> Out
```
