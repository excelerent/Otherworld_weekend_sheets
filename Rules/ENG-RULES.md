# Engineering Rules

This document outlines the basic engineering rules for the Otherworld Party Path and Charge Worksheet projects.

## Version Control Rules
- **Commit after every change**: To ensure we can rollback properly if needed, a Git commit must be made after every significant change or atomic task completion.
- **Descriptive Commit Messages**: All commit messages should clearly describe what was changed and why.

## Code Quality and Style
- **Consistency**: Follow the existing code style in the project. For TypeScript/JavaScript, maintain the current indentation and naming conventions.
- **Minimalism**: Implement only what is required to satisfy the project goals. Avoid over-engineering.
- **Comments**: Keep comments meaningful and match the frequency of the existing codebase.

## Documentation
- **Updates**: Any changes to the tool's logic or project structure should be reflected in the relevant documentation.
- **Clarity**: Documentation should be clear enough for another developer to understand the project's purpose and how to run the tool.

## Testing and Verification
- **Verification**: Always verify the output (e.g., `PartyPaths.csv`, `ChargeTable.json`) after running the generation script to ensure data integrity.
- **Error Handling**: Maintain robust error handling for all operations, including PDF parsing, Excel processing, and file system operations.
