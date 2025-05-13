# Contributing to Sigil

Thank you for your interest in contributing to Sigil! This document provides guidelines for contributing to the project.

## Branching Strategy

We follow a specific branching model to maintain code quality and organization:

- `main` - The production branch. Contains stable, released code.
- `dev` - The development branch. All new features and bug fixes should eventually be merged here.

### Feature Development and Bug Fixes

When working on a new feature or bug fix:

1. Create a branch from `dev` following this naming convention:
   - For features: `dev.your_feature_name` (e.g., `dev.add_voice_recognition`)
   - For bug fixes: `dev.your_bug_fix` (e.g., `dev.fix_memory_leak`)

2. You can create deeper branch hierarchies as needed:
   - `dev.your_feature.sub_feature`
   - `dev.your_bug.specific_fix`

3. When your work is complete, merge changes back up the chain:
   - First merge your feature branch back to `dev`
   - Eventually, `dev` will be merged to `main` for releases

## Code Review Process

1. Create a pull request (PR) when your changes are ready
2. Ensure your code passes all tests
3. The project maintainer will review your PR
4. Address any feedback from the review
5. Once approved, your PR will be merged by the maintainer

## Research Study Participation

This project is being monitored as part of a research study on type annotations in dynamic languages, conducted by researchers from the University of Nebraska-Lincoln.

### What you should know:

- A bot tracks changes related to type annotations in this repository
- After making relevant changes, you may be asked to participate in the study
- You'll receive notifications no more than once every 24 hours
- Participation is completely voluntary
- You can opt-out or request data removal at any time

We encourage contributors to complete the survey when asked, as it helps advance research in programming language design and developer tools.

The study has been approved by the University of Nebraska-Lincoln Institutional Review Board (IRB# 23988) with the title "Understanding Developers' Addition and Removal of Type Annotations".

## Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies with `pip install -r requirements.txt`
4. Create a virtual environment with `python -m venv venv`
5. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On Unix/macOS: `source venv/bin/activate`

## Testing

Please ensure all tests pass before submitting your PR:

```bash
pytest tests/
```

## Questions?

If you have any questions or need help, please open an issue or contact the maintainer.

Thank you for contributing to Sigil!
