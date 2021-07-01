/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IStartEntry, IWalkthrough } from 'vs/platform/extensions/common/extensions';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';

const titleTranslated = localize('title', "Title");

export const walkthroughsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<IWalkthrough[]>({
	extensionPoint: 'walkthroughs',
	jsonSchema: {
		description: localize('walkthroughs', "Contribute walkthroughs to help users getting started with your extension."),
		type: 'array',
		items: {
			type: 'object',
			required: ['id', 'title', 'description', 'steps'],
			defaultSnippets: [{ body: { 'id': '$1', 'title': '$2', 'description': '$3', 'steps': [] } }],
			properties: {
				id: {
					type: 'string',
					description: localize('walkthroughs.id', "Unique identifier for this walkthrough."),
				},
				title: {
					type: 'string',
					description: localize('walkthroughs.title', "Title of walkthrough.")
				},
				description: {
					type: 'string',
					description: localize('walkthroughs.description', "Description of walkthrough.")
				},
				primary: {
					deprecationMessage: localize('walkthroughs.primary.deprecated', "Deprecated. The first walkthrough with a satisfied when condition will be opened on install.")
				},
				when: {
					type: 'string',
					description: localize('walkthroughs.when', "Context key expression to control the visibility of this walkthrough.")
				},
				tasks: {
					deprecationMessage: localize('usesteps', "Deprecated. Use `steps` instead")
				},
				steps: {
					type: 'array',
					description: localize('walkthroughs.steps', "Steps to complete as part of this walkthrough."),
					items: {
						type: 'object',
						required: ['id', 'title', 'media'],
						defaultSnippets: [{
							body: {
								'id': '$1', 'title': '$2', 'description': '$3',
								'completionEvents': ['$5'],
								'media': { 'path': '$6', 'type': '$7' }
							}
						}],
						properties: {
							id: {
								type: 'string',
								description: localize('walkthroughs.steps.id', "Unique identifier for this step. This is used to keep track of which steps have been completed."),
							},
							title: {
								type: 'string',
								description: localize('walkthroughs.steps.title', "Title of step.")
							},
							description: {
								type: 'string',
								description: localize('walkthroughs.steps.description.interpolated', "Description of step. Supports ``preformatted``, __italic__, and **bold** text. Use markdown-style links for commands or external links: {0}, {1}, or {2}. Links on their own line will be rendered as buttons.", `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`)
							},
							button: {
								deprecationMessage: localize('walkthroughs.steps.button.deprecated.interpolated', "Deprecated. Use markdown links in the description instead, i.e. {0}, {1}, or {2}", `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`),
							},
							media: {
								type: 'object',
								description: localize('walkthroughs.steps.media', "Media to show alongside this step, either an image or markdown content."),
								defaultSnippets: [{ 'body': { 'type': '$1', 'path': '$2' } }],
								oneOf: [
									{
										required: ['image', 'altText'],
										additionalProperties: false,
										properties: {
											path: {
												deprecationMessage: localize('pathDeprecated', "Deprecated. Please use `image` or `markdown` instead")
											},
											image: {
												description: localize('walkthroughs.steps.media.image.path.string', "Path to an image - or object consisting of paths to light, dark, and hc images - relative to extension directory. Depending on context, the image will be displayed from 400px to 800px wide, with similar bounds on height. To support HIDPI displays, the image will be rendered at 1.5x scaling, for example a 900 physical pixels wide image will be displayed as 600 logical pixels wide."),
												oneOf: [
													{
														type: 'string',
													},
													{
														type: 'object',
														required: ['dark', 'light', 'hc'],
														properties: {
															dark: {
																description: localize('walkthroughs.steps.media.image.path.dark.string', "Path to the image for dark themes, relative to extension directory."),
																type: 'string',
															},
															light: {
																description: localize('walkthroughs.steps.media.image.path.light.string', "Path to the image for light themes, relative to extension directory."),
																type: 'string',
															},
															hc: {
																description: localize('walkthroughs.steps.media.image.path.hc.string', "Path to the image for hc themes, relative to extension directory."),
																type: 'string',
															}
														}
													}
												]
											},
											altText: {
												type: 'string',
												description: localize('walkthroughs.steps.media.altText', "Alternate text to display when the image cannot be loaded or in screen readers.")
											}
										}
									}, {
										required: ['markdown'],
										additionalProperties: false,
										properties: {
											path: {
												deprecationMessage: localize('pathDeprecated', "Deprecated. Please use `image` or `markdown` instead")
											},
											markdown: {
												description: localize('walkthroughs.steps.media.markdown.path', "Path to the markdown document, relative to extension directory."),
												type: 'string',
											}
										}
									}
								]
							},
							completionEvents: {
								description: localize('walkthroughs.steps.completionEvents', "Events that should trigger this step to become checked off. If empty or not defined, the step will check off when any of the step's buttons or links are clicked; if the step has no buttons or links it will check on when it is selected."),
								type: 'array',
								items: {
									type: 'string',
									defaultSnippets: [
										{
											label: 'onCommand',
											description: localize('walkthroughs.steps.completionEvents.onCommand', 'Check off step when a given command is executed anywhere in VS Code.'),
											body: 'onCommand:${1:commandId}'
										},
										{
											label: 'onLink',
											description: localize('walkthroughs.steps.completionEvents.onLink', 'Check off step when a given link is opened via a walkthrough step.'),
											body: 'onLink:${2:linkId}'
										},
										{
											label: 'onView',
											description: localize('walkthroughs.steps.completionEvents.onView', 'Check off step when a given view is opened'),
											body: 'onView:${2:viewId}'
										},
										{
											label: 'onSettingChanged',
											description: localize('walkthroughs.steps.completionEvents.onSettingChanged', 'Check off step when a given setting is changed'),
											body: 'onSettingChanged:${2:settingName}'
										},
										{
											label: 'onContext',
											description: localize('walkthroughs.steps.completionEvents.onContext', 'Check off step when a context key expression is true.'),
											body: 'onContext:${2:key}'
										},
										{
											label: 'extensionInstalled',
											description: localize('walkthroughs.steps.completionEvents.extensionInstalled', 'Check off step when an extension with the given id is installed. If the extension is already installed, the step will start off checked.'),
											body: 'extensionInstalled:${3:extensionId}'
										},
										{
											label: 'stepSelected',
											description: localize('walkthroughs.steps.completionEvents.stepSelected', 'Check off step as soon as it is selected.'),
											body: 'stepSelected'
										},
									]
								}
							},
							doneOn: {
								description: localize('walkthroughs.steps.doneOn', "Signal to mark step as complete."),
								deprecationMessage: localize('walkthroughs.steps.doneOn.deprecation', "doneOn is deprecated. By default steps will be checked off when their buttons are clicked, to configure further use completionEvents"),
								type: 'object',
								required: ['command'],
								defaultSnippets: [{ 'body': { command: '$1' } }],
								properties: {
									'command': {
										description: localize('walkthroughs.steps.oneOn.command', "Mark step done when the specified command is executed."),
										type: 'string'
									}
								},
							},
							when: {
								type: 'string',
								description: localize('walkthroughs.steps.when', "Context key expression to control the visibility of this step.")
							}
						}
					}
				}
			}
		}
	}
});

export const startEntriesExtensionPoint = ExtensionsRegistry.registerExtensionPoint<IStartEntry[]>({
	extensionPoint: 'startEntries',
	jsonSchema: {
		description: localize('startEntries', "Contribute commands to the `Welcome: New...` picker."),
		type: 'array',
		items: {
			type: 'object',
			required: ['title', 'command'],
			additionalProperties: false,
			defaultSnippets: [{ body: { 'title': '$1', 'command': '$3' } }],
			properties: {
				title: {
					type: 'string',
					description: localize('startEntries.title', "Title of item.")
				},
				command: {
					type: 'string',
					description: localize('startEntries.command', "Command to run.")
				},
				category: {
					type: 'string',
					description: localize('startEntries.category', "Category of the new entry."),
					enum: ['file', 'folder', 'notebook'],
				},
				description: {
					type: 'string',
					description: localize('startEntries.description', "Description of item. We recommend leaving this blank unless the action is significantly nuanced in a way the title can not capture.")
				},
				when: {
					type: 'string',
					description: localize('startEntries.when', "Context key expression to control the visibility of this item.")
				},
			}
		}
	}
});
