# Extension-Dice

## How to install

Install via the built-in "Download Extensions and Assets" tool. Or use a direct link:

```txt
https://github.com/SillyTavern/Extension-Dice
```

## How to use

### Via the function tool

Disabled by default. To enable, go to extension settings, find "D&D Dice" and enable the "Use function tool" option.

Requires a comptabile Chat Completion backend. See [Function Calling](https://docs.sillytavern.app/for-contributors/function-calling/) for more information.

To roll the dice, just ask for it. For example:

```txt
Roll a d20
```

### Via the wand menu

A set of 7 classic D&amp;D dice for all your dice rolling needs. Dice rolls are just for show and are not visible in AI prompts.

1. Open the wand menu.
2. Click on the "Roll Dice" item.
3. Select the dice you want to roll, or `...` if you want to roll a custom dice.

### Via the slash command

You can also roll dice using the slash command `/roll`. For example:

```txt
/roll 1d20
```

To supress the chat message, pass a `quiet=true` argument. Then you can use the roll result passed down the pipe to the next command. For example, to echo the result of a roll without sending a message:

```txt
/roll quiet=true 1d20 | /echo
```

### Rigging d20 rolls (debug)

This fork adds a debug control to force the outcome of plain `d20` / `1d20` rolls — useful when developing scripts or characters that branch on a specific roll result.

1. Open **Extensions** settings and expand the **D&D Dice** panel.
2. In the **Rig d20 result** field, enter an integer from 1 to 20.
3. Any subsequent plain `d20` roll — from the wand menu, `/roll d20`, or the `RollTheDice` function tool — will return that value. The chat message is suffixed with `[rigged]` so it is obvious the roll was forced.
4. To resume normal rolling, clear the field (or click the **Clear** button).

Compound formulas such as `2d20`, `d20+5`, or any non-d20 die are not affected and continue to roll normally.

### Limiting the d20 range (soft fate)

This fork also adds a range limit to keep plain `d20` / `1d20` rolls from going too badly (or too well) — useful as a softer version of fate that still leaves room for luck.

1. Open **Extensions** settings and expand the **D&D Dice** panel.
2. In the **Limit d20 range** fields, enter a minimum and/or maximum value from 1 to 20 (e.g. **11** and **20**).
3. Any subsequent plain `d20` roll — from the wand menu, `/roll d20`, or the `RollTheDice` function tool — is clamped into that range. A roll that gets clamped is suffixed with `[clamped to min-max]` in chat so the adjustment is visible.
4. Either bound can be left empty to clamp only one side (e.g. a minimum of 5 with an empty maximum gives 5–20). To resume fully unrestricted rolling, clear both fields (or click the **Clear** button).

The range limit applies on top of the rigged value, so a rigged result outside the range is clamped as well. Compound formulas such as `2d20`, `d20+5`, or any non-d20 die are not affected and continue to roll normally.

## License

This extension is licensed under the AGPL-3.0 license.
