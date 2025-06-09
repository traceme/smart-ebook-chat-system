# Smart eBook Chat System

An intelligent ebook chat system integrated with TaskMaster AI for efficient reading, analysis, and task management.

## Features

- **eBook Loading**: Load and process various ebook formats
- **Interactive Chat**: Chat about ebook content with AI assistance
- **Task Management**: Automatically create and manage tasks related to ebook analysis
- **TaskMaster AI Integration**: Leverages TaskMaster AI for intelligent task breakdown and management

## Usage

1. **Start the system**:
   ```bash
   python main.py
   ```

2. **Load an ebook**:
   ```
   > load path/to/your/ebook.pdf
   ```

3. **Chat about the ebook**:
   ```
   > chat What are the main themes in this book?
   ```

4. **Create analysis tasks**:
   ```
   > task Create a comprehensive summary of chapter 3
   ```

5. **View tasks**:
   ```
   > tasks
   ```

## Commands

- `load <ebook_path>` - Load an ebook for analysis
- `chat <message>` - Chat about the current ebook
- `task <description>` - Create a new task
- `tasks` - View all current tasks
- `quit` - Exit the system

## TaskMaster AI Integration

This system integrates with TaskMaster AI (configured in your MCP setup) to:

- Automatically break down complex reading/analysis tasks into manageable subtasks
- Prioritize tasks based on importance and urgency
- Track progress on ebook-related activities
- Generate intelligent task suggestions based on chat interactions

## Development

The system is designed to be extended with:
- PDF/EPUB parsing capabilities
- AI-powered content analysis
- Advanced chat features
- Integration with external reading platforms
- Collaborative reading and annotation features

## Configuration

TaskMaster AI is configured in your Cursor MCP setup with the following environment:
- Model: Claude Sonnet 4
- Max Tokens: 64,000
- Temperature: 0.2
- Default Subtasks: 5
- Default Priority: medium
