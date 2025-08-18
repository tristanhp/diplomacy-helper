# Diplomacy Helper

A comprehensive board game assistant for the classic strategy game Diplomacy.

## Project Structure

This repository contains two versions of the Diplomacy Helper application:

### 📁 v1/ - Original Implementation
- **Status**: Complete and stable
- **Technology**: React + TypeScript + Vite + TailwindCSS
- **Features**: 
  - Complete game engine with adjudication logic
  - Interactive map visualization
  - Order composition and validation
  - Phase transition handling (including retreats and adjustments)
  - Split-coast support for Spain, Bulgaria, and St. Petersburg

### 📁 v2/ - Next Generation (Work in Progress)
- **Status**: In development
- **Technology**: React 18 + TypeScript 5 + Vite + TailwindCSS
- **Goals**: 
  - Improved architecture and performance
  - Enhanced user experience
  - Modern design patterns
  - Better maintainability

## Getting Started

### Running v1 (Stable)
```bash
cd v1
npm install
npm run dev
```

### Running v2 (Development)
```bash
cd v2
npm install
npm run dev
```

## Development

- **v1**: Preserved for reference and stability
- **v2**: Active development branch with modern improvements

Both versions run on different ports:
- v1: http://localhost:5173
- v2: http://localhost:3001

## Contributing

All new development should be done in the `v2` directory. The `v1` directory is maintained for reference and should not be modified unless critical bugs need fixing.
