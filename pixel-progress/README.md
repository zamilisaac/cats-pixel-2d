# Pixel Progress (cat edition), a mod for Claude Code

Watch Claude work, live. Pixel Progress adds two things to Claude Code:

- **A progress bar above your prompt.** A sleeping cat at the start, a pastel rainbow fill with paw prints, a calico cat running along it chasing a ball of yarn, a "Tasks 2/5 · Pre-outline" pill and a food bowl at 100%. When the task is done the cat reaches the bowl with little hearts.
- **An Agents side panel.** When Claude splits work across subagents, each one gets a card with its own pixel cat in an outfit (builder, gamer, chef, detective and more; 12 in all). Cats close their eyes happily when their work is done. The card shows the model, tokens and time, "Step 3 · …" with a spinner, the agent's last two actions (like "Reading research.md") and a thin bar that fills as steps finish. Running agents sit under a green "Running" bar and finished ones under "Finished", with totals on top.

The mod asks Claude to report progress by itself on any job with 3 or more steps or with subagents, so there is nothing to set up per task.

Unofficial community mod. Not affiliated with or endorsed by Anthropic.

## Requirements

- Claude Code 2.1.310 or newer. Check with `claude --version`, and update with `claude update`.
- A local session: Claude Code in a terminal, or the desktop app's Code tab working on your own computer.
- It does not work in the claude.ai chat or in cloud sessions, since those can't load mods.

## Installation guide

### Quick install on Windows

Unzip `pixel-progress-cat.zip`, then double-click `install.cmd`. It copies the mod to `C:\Users\YOU\claude-mods\pixel-progress` and adds it to `settings.json`. Restart Claude and type `/progress-demo`. The steps below are the manual way.

### 1. Unzip to a permanent folder

Keep the folder somewhere you won't delete, because Claude Code loads the mod from it each time.

- Windows: `C:\Users\YOU\claude-mods\pixel-progress`
- Mac: `~/claude-mods/pixel-progress`

Check that the folder you point to contains `.claude-plugin`, `hooks` and `types`, not another `pixel-progress` folder inside it.

### 2. Start Claude Code with the mod

Windows (PowerShell):

```
claude --plugin-dir "C:\Users\YOU\claude-mods\pixel-progress"
```

Mac (Terminal):

```
claude --plugin-dir ~/claude-mods/pixel-progress
```

### 3. Try it

Type this at the Claude Code prompt:

```
/progress-demo
```

A demo task with five fake agents plays in the bar and the Agents panel. Run `/progress-clear` afterwards.

### 4. Optional: load it every time

To load the mod in every session without typing `--plugin-dir`, the desktop app's Code tab included, open `~/.claude/settings.json` (Windows: `C:\Users\YOU\.claude\settings.json`) and add:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Users\\YOU\\claude-mods\\pixel-progress"
  }
}
```

On a Mac use `"~/claude-mods/pixel-progress"`. If the file already has an `env` section, add the line inside it. If `CLAUDE_CODE_PLUGIN_DIRS` is already set, add this folder at the end, separated with `;` on Windows or `:` on Mac. Restart Claude Code afterwards.

## Commands

| Command | What it does |
| --- | --- |
| `/progress-demo` | Plays a demo with five fake agents |
| `/progress-panel` | Shows or hides the Agents panel |
| `/progress-clear` | Clears the bar and the agent list |
| `/progress-theme` | Changes the bar look: `cat` (default), `office` or `rocket`. With no word it steps to the next one. Your choice is remembered. |

The ×N button next to the bar also opens the panel, and ✕ hides the bar.

## Troubleshooting

- **"/progress-demo" is an unknown command.** The mod didn't load. Check the folder path in step 2 (it must be the folder that holds `.claude-plugin`), then run `claude --version` to confirm 2.1.310 or newer.
- **"Plugins aren't available in this environment".** You're in claude.ai chat or a cloud session. Use Claude Code in a terminal, or a local session in the desktop app.
- **The panel doesn't appear.** Run `/progress-panel`, or click ×N next to the bar.
- **Claude didn't show a bar for a small task.** That's intended: the bar is for jobs with 3 or more steps or with subagents.
- **The terminal shows text bars instead of animations.** That's intended. The full animated drawings show in the desktop app; terminals get text bars with a spinner.

## Privacy

Pixel Progress makes no internet requests and sends nothing anywhere. It only reads Claude Code's own events in your session to draw the bar and the panel. Token counts are the ones Claude Code reports; the mod does not estimate cost.
