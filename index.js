import { animation_duration } from '../../../../script.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { POPUP_TYPE, callGenericPopup } from '../../../popup.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { commonEnumProviders } from '../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { isTrueBoolean } from '../../../utils.js';
export { MODULE_NAME };

const MODULE_NAME = 'dice';
const TEMPLATE_PATH = 'third-party/Extension-Dice-rigged';

// Define default settings
const defaultSettings = Object.freeze({
    functionTool: false,
    riggedD20: null,
    rangeMin: null,
    rangeMax: null,
});

// Define a function to get or initialize settings
function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();

    // Initialize settings if they don't exist
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }

    // Ensure all default keys exist (helpful after updates)
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }

    return extensionSettings[MODULE_NAME];
}

/**
 * Normalize a stored range bound to a valid d20 face value or null.
 * @param {*} value Stored setting value
 * @returns {number|null} Integer in 1-20, or null if unset/invalid
 */
function normalizeRangeBound(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : null;
}

/**
 * Clamp a roll total into the configured d20 range, if one is set.
 * @param {*} settings Extension settings
 * @param {number} total Roll total
 * @returns {{total: number, suffix: string}} Clamped total and a chat suffix noting the clamp
 */
function clampToRange(settings, total) {
    const clampMin = normalizeRangeBound(settings.rangeMin);
    const clampMax = normalizeRangeBound(settings.rangeMax);
    if (clampMin === null && clampMax === null) {
        return { total, suffix: '' };
    }
    const min = clampMin ?? 1;
    const max = clampMax ?? 20;
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const clamped = Math.min(hi, Math.max(lo, total));
    return clamped === total
        ? { total, suffix: '' }
        : { total: clamped, suffix: ` [clamped to ${lo}-${hi}]` };
}

/**
 * Roll the dice.
 * @param {string} customDiceFormula Dice formula
 * @param {boolean} quiet Suppress chat output
 * @returns {Promise<{total: string, rolls: Array<string>}>} Roll result
 */
async function doDiceRoll(customDiceFormula, quiet = false) {
    const nullValue = { total: '', rolls: [] };

    let value = typeof customDiceFormula === 'string' ? customDiceFormula.trim() : $(this).data('value');

    if (value == 'custom') {
        value = await callGenericPopup('Enter the dice formula:<br><i>(for example, <tt>2d6</tt>)</i>', POPUP_TYPE.INPUT, '', { okButton: 'Roll', cancelButton: 'Cancel' });
    }

    if (!value) {
        return nullValue;
    }

    const isValid = SillyTavern.libs.droll.validate(value);

    if (isValid) {
        const settings = getSettings();
        const isPlainD20 = /^\s*1?d20\s*$/i.test(value);
        const rigged = Number(settings.riggedD20);
        if (isPlainD20 && Number.isInteger(rigged) && rigged >= 1 && rigged <= 20) {
            const clamped = clampToRange(settings, rigged);
            if (!quiet) {
                const context = SillyTavern.getContext();
                context.sendSystemMessage('generic', `${context.name1} rolls a ${value}. The result is: ${clamped.total} (${clamped.total}) [rigged]${clamped.suffix}`, { isSmallSys: true });
            }
            return { total: String(clamped.total), rolls: [String(clamped.total)] };
        }

        const result = SillyTavern.libs.droll.roll(value);
        if (!result) {
            return nullValue;
        }
        const { total, suffix } = isPlainD20 ? clampToRange(settings, result.total) : { total: result.total, suffix: '' };
        if (!quiet) {
            const context = SillyTavern.getContext();
            context.sendSystemMessage('generic', `${context.name1} rolls a ${value}. The result is: ${total} (${result.rolls.join(', ')})${suffix}`, { isSmallSys: true });
        }
        return { total: String(total), rolls: result.rolls.map(String) };
    } else {
        toastr.warning('Invalid dice formula');
        return nullValue;
    }

}

async function addDiceRollButton() {
    const buttonHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'button');
    const dropdownHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'dropdown');
    const settingsHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'settings');

    const getWandContainer = () => $(document.getElementById('dice_wand_container') ?? document.getElementById('extensionsMenu'));
    getWandContainer().append(buttonHtml);

    const getSettingsContainer = () => $(document.getElementById('dice_container') ?? document.getElementById('extensions_settings2'));
    getSettingsContainer().append(settingsHtml);

    const settings = getSettings();
    $('#dice_function_tool').prop('checked', settings.functionTool).on('change', function () {
        settings.functionTool = !!$(this).prop('checked');
        SillyTavern.getContext().saveSettingsDebounced();
        registerFunctionTools();
    });

    const rigInput = $('#dice_rig_d20_input');
    rigInput.val(settings.riggedD20 ?? '');
    rigInput.on('change', function () {
        const raw = String($(this).val()).trim();
        if (raw === '') {
            settings.riggedD20 = null;
        } else {
            const parsed = Number(raw);
            if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
                toastr.warning('Rigged d20 value must be an integer from 1 to 20');
                $(this).val(settings.riggedD20 ?? '');
                return;
            }
            settings.riggedD20 = parsed;
        }
        SillyTavern.getContext().saveSettingsDebounced();
    });
    $('#dice_rig_d20_clear').on('click', function () {
        settings.riggedD20 = null;
        rigInput.val('');
        SillyTavern.getContext().saveSettingsDebounced();
    });

    const rangeMinInput = $('#dice_range_min_input');
    const rangeMaxInput = $('#dice_range_max_input');
    rangeMinInput.val(settings.rangeMin ?? '');
    rangeMaxInput.val(settings.rangeMax ?? '');
    const onRangeChange = function (key, input) {
        const raw = String($(input).val()).trim();
        if (raw === '') {
            settings[key] = null;
        } else {
            const parsed = Number(raw);
            if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
                toastr.warning('Range values must be integers from 1 to 20');
                $(input).val(settings[key] ?? '');
                return;
            }
            settings[key] = parsed;
        }
        SillyTavern.getContext().saveSettingsDebounced();
    };
    rangeMinInput.on('change', function () { onRangeChange('rangeMin', this); });
    rangeMaxInput.on('change', function () { onRangeChange('rangeMax', this); });
    $('#dice_range_clear').on('click', function () {
        settings.rangeMin = null;
        settings.rangeMax = null;
        rangeMinInput.val('');
        rangeMaxInput.val('');
        SillyTavern.getContext().saveSettingsDebounced();
    });

    $(document.body).append(dropdownHtml);
    $('#dice_dropdown li').on('click', function () {
        dropdown.fadeOut(animation_duration);
        doDiceRoll($(this).data('value'), false);
    });
    const button = $('#roll_dice');
    const dropdown = $('#dice_dropdown');
    dropdown.hide();

    const popper = SillyTavern.libs.Popper.createPopper(button.get(0), dropdown.get(0), {
        placement: 'top',
    });

    $(document).on('click touchend', function (e) {
        const target = $(e.target);
        if (target.is(dropdown) || target.closest(dropdown).length) return;
        if (target.is(button) && !dropdown.is(':visible')) {
            e.preventDefault();

            dropdown.fadeIn(animation_duration);
            popper.update();
        } else {
            dropdown.fadeOut(animation_duration);
        }
    });
}

function registerFunctionTools() {
    try {
        const { registerFunctionTool, unregisterFunctionTool } = SillyTavern.getContext();
        if (!registerFunctionTool || !unregisterFunctionTool) {
            console.debug('Dice: function tools are not supported');
            return;
        }

        unregisterFunctionTool('RollTheDice');

        // Function tool is disabled by the settings
        const settings = getSettings();
        if (!settings.functionTool) {
            return;
        }

        const rollDiceSchema = Object.freeze({
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
                who: {
                    type: 'string',
                    description: 'The name of the persona rolling the dice',
                },
                formula: {
                    type: 'string',
                    description: 'A dice formula to roll, e.g. 2d6',
                },
            },
            required: [
                'who',
                'formula',
            ],
        });

        registerFunctionTool({
            name: 'RollTheDice',
            displayName: 'Dice Roll',
            description: 'Rolls the dice using the provided formula and returns the numeric result. Use when it is necessary to roll the dice to determine the outcome of an action or when the user requests it.',
            parameters: rollDiceSchema,
            action: async (args) => {
                if (!args?.formula) args = { formula: '1d6' };
                const roll = await doDiceRoll(args.formula, true);
                const result = args.who
                    ? `${args.who} rolls a ${args.formula}. The result is: ${roll.total}. Individual rolls: ${roll.rolls.join(', ')}`
                    : `The result or a ${args.formula} roll is: ${roll.total}. Individual rolls: ${roll.rolls.join(', ')}`;
                return result;
            },
            formatMessage: () => '',
        });
    } catch (error) {
        console.error('Dice: Error registering function tools', error);
    }
}

jQuery(async function () {
    await addDiceRollButton();
    registerFunctionTools();
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'roll',
        aliases: ['r'],
        callback: async (args, value) => {
            const quiet = isTrueBoolean(String(args.quiet));
            const result = await doDiceRoll(String(value || '1d6'), quiet);
            return result.total;
        },
        helpString: 'Roll the dice.',
        returns: 'roll result',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'quiet',
                description: 'Do not display the result in chat',
                isRequired: false,
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                defaultValue: String(false),
                enumProvider: commonEnumProviders.boolean('trueFalse'),
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'dice formula, e.g. 2d6',
                isRequired: true,
                typeList: [ARGUMENT_TYPE.STRING],
            }),
        ],
    }));
});
