/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import { IUriIdentityService } from 'vs/platform/uriIdentity/common/uriIdentity';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ITerminalLinkDetector, ITerminalLinkResolver, ITerminalSimpleLink, TerminalBuiltinLinkType } from 'vs/workbench/contrib/terminalContrib/links/browser/links';
import { convertLinkRangeToBuffer, getXtermLineContent } from 'vs/workbench/contrib/terminalContrib/links/browser/terminalLinkHelpers';
import { IBufferLine, Terminal } from 'xterm';
import { ITerminalProcessManager } from 'vs/workbench/contrib/terminal/common/terminal';
import { ITerminalBackend, ITerminalLogService } from 'vs/platform/terminal/common/terminal';

const enum Constants {
	/**
	 * The max line length to try extract word links from.
	 */
	MaxLineLength = 2000,

	/**
	 * The maximum number of links in a line to resolve against the file system. This limit is put
	 * in place to avoid sending excessive data when remote connections are in place.
	 */
	MaxResolvedLinksInLine = 10,

	/**
	 * The maximum length of a link to resolve against the file system. This limit is put in place
	 * to avoid sending excessive data when remote connections are in place.
	 */
	MaxResolvedLinkLength = 1024,
}

const candidateMatchers = [
	// Ripgrep:
	//   16:console.log(...)
	//   16:    console.log(...)
	// Eslint:
	//   16:5  error ...
	/\s*(?<link>(?<line>\d+):(?<col>\d+)?)/
];

export class TerminalMultiLineLinkDetector implements ITerminalLinkDetector {
	static id = 'multiline';

	// This was chosen as a reasonable maximum line length given the tradeoff between performance
	// and how likely it is to encounter such a large line length. Some useful reference points:
	// - Window old max length: 260 ($MAX_PATH)
	// - Linux max length: 4096 ($PATH_MAX)
	readonly maxLinkLength = 500;

	constructor(
		readonly xterm: Terminal,
		private readonly _processManager: Pick<ITerminalProcessManager, 'initialCwd' | 'os' | 'remoteAuthority' | 'userHome'> & { backend?: Pick<ITerminalBackend, 'getWslPath'> },
		private readonly _linkResolver: ITerminalLinkResolver,
		@ITerminalLogService private readonly _logService: ITerminalLogService,
		@IUriIdentityService private readonly _uriIdentityService: IUriIdentityService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService
	) {
	}

	async detect(lines: IBufferLine[], startLine: number, endLine: number): Promise<ITerminalSimpleLink[]> {
		const links: ITerminalSimpleLink[] = [];

		// Get the text representation of the wrapped line
		const text = getXtermLineContent(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
		if (text === '' || text.length > Constants.MaxLineLength) {
			return [];
		}

		let stringIndex = -1;

		this._logService.trace('terminalMultiLineLinkDetector#detect text', text);

		// Match against the fallback matchers which are mainly designed to catch paths with spaces
		// that aren't possible using the regular mechanism.
		for (const matcher of candidateMatchers) {
			const match = text.match(matcher);
			const group = match?.groups;
			if (!group) {
				continue;
			}
			const link = group?.link;
			const line = group?.line;
			const col = group?.col;
			if (!link || line === undefined) {
				continue;
			}

			// Don't try resolve any links of excessive length
			if (link.length > Constants.MaxResolvedLinkLength) {
				continue;
			}

			// TODO: Log more info?
			this._logService.trace('terminalMultiLineLinkDetector#detect candidates', link);

			// Scan up looking for the first line that could be a path
			let possiblePath: string | undefined;
			for (let index = startLine - 1; index > 0; index--) {
				// TODO: Skip wrapped lines
				const text = getXtermLineContent(this.xterm.buffer.active, index, index, this.xterm.cols);
				if (!text.match(/^\s*\d/)) {
					possiblePath = text;
					break;
				}
			}
			if (!possiblePath) {
				continue;
			}

			// Check if the first non-matching line is an absolute or relative link
			const linkStat = await this._linkResolver.resolveLink(this._processManager, possiblePath);
			if (linkStat) {
				let type: TerminalBuiltinLinkType;
				if (linkStat.isDirectory) {
					if (this._isDirectoryInsideWorkspace(linkStat.uri)) {
						type = TerminalBuiltinLinkType.LocalFolderInWorkspace;
					} else {
						type = TerminalBuiltinLinkType.LocalFolderOutsideWorkspace;
					}
				} else {
					type = TerminalBuiltinLinkType.LocalFile;
				}

				// Convert the entire line's text string index into a wrapped buffer range
				stringIndex = text.indexOf(link);
				const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
					startColumn: stringIndex + 1,
					startLineNumber: 1,
					endColumn: stringIndex + 1 + text.length + 1,
					endLineNumber: 1
				}, startLine);

				const simpleLink: ITerminalSimpleLink = {
					text: link,
					uri: linkStat.uri,
					selection: {
						startLineNumber: parseInt(line),
						startColumn: col ? parseInt(col) : 0
					},
					bufferRange: bufferRange,
					type
				};
				this._logService.trace('terminalMultiLineLinkDetector#detect verified link', simpleLink);
				links.push(simpleLink);

				// Break on the first match
				break;
			}
		}

		return links;
	}

	private _isDirectoryInsideWorkspace(uri: URI) {
		const folders = this._workspaceContextService.getWorkspace().folders;
		for (let i = 0; i < folders.length; i++) {
			if (this._uriIdentityService.extUri.isEqualOrParent(uri, folders[i].uri)) {
				return true;
			}
		}
		return false;
	}
}
