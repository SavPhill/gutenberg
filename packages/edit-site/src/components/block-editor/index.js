/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback, useRef, Fragment } from '@wordpress/element';
import { useEntityBlockEditor, store as coreStore } from '@wordpress/core-data';
import {
	BlockList,
	BlockEditorProvider,
	__experimentalLinkControl,
	BlockInspector,
	BlockTools,
	__unstableBlockToolbarLastItem,
	__unstableBlockSettingsMenuFirstItem,
	__unstableUseTypingObserver as useTypingObserver,
	BlockEditorKeyboardShortcuts,
	store as blockEditorStore,
	__unstableBlockNameContext,
	InnerBlocks,
} from '@wordpress/block-editor';
import { useMergeRefs, useViewportMatch } from '@wordpress/compose';
import { ReusableBlocksMenuItems } from '@wordpress/reusable-blocks';
import { listView } from '@wordpress/icons';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';

/**
 * Internal dependencies
 */
import TemplatePartConverter from '../template-part-converter';
import NavigateToLink from '../navigate-to-link';
import { SidebarInspectorFill } from '../sidebar';
import { store as editSiteStore } from '../../store';
import BlockInspectorButton from './block-inspector-button';
import EditTemplatePartMenuButton from '../edit-template-part-menu-button';
import BackButton from './back-button';
import ResizableEditor from './resizable-editor';

const LAYOUT = {
	type: 'default',
	// At the root level of the site editor, no alignments should be allowed.
	alignments: [],
};

export default function BlockEditor( { setIsInserterOpen } ) {
	const { settings } = useSelect(
		( select ) => {
			let storedSettings = select( editSiteStore ).getSettings(
				setIsInserterOpen
			);

			if ( ! storedSettings.__experimentalBlockPatterns ) {
				storedSettings = {
					...storedSettings,
					__experimentalBlockPatterns: select(
						coreStore
					).getBlockPatterns(),
				};
			}

			if ( ! storedSettings.__experimentalBlockPatternCategories ) {
				storedSettings = {
					...storedSettings,
					__experimentalBlockPatternCategories: select(
						coreStore
					).getBlockPatternCategories(),
				};
			}

			return {
				settings: storedSettings,
			};
		},
		[ setIsInserterOpen ]
	);

	const { templateType, templateId, page } = useSelect(
		( select ) => {
			const { getEditedPostType, getEditedPostId, getPage } = select(
				editSiteStore
			);

			return {
				templateType: getEditedPostType(),
				templateId: getEditedPostId(),
				page: getPage(),
			};
		},
		[ setIsInserterOpen ]
	);

	const [ blocks, onInput, onChange ] = useEntityBlockEditor(
		'postType',
		templateType
	);
	const { setPage } = useDispatch( editSiteStore );
	const { enableComplementaryArea } = useDispatch( interfaceStore );
	const openNavigationSidebar = useCallback( () => {
		enableComplementaryArea(
			'core/edit-site',
			'edit-site/navigation-menu'
		);
	}, [ enableComplementaryArea ] );
	const contentRef = useRef();
	const mergedRefs = useMergeRefs( [ contentRef, useTypingObserver() ] );
	const isMobileViewport = useViewportMatch( 'small', '<' );
	const { clearSelectedBlock } = useDispatch( blockEditorStore );

	const isTemplatePart = templateType === 'wp_template_part';
	const hasBlocks = blocks.length !== 0;

	const NavMenuSidebarToggle = () => (
		<ToolbarGroup>
			<ToolbarButton
				className="components-toolbar__control"
				label={ __( 'Open list view' ) }
				onClick={ openNavigationSidebar }
				icon={ listView }
			/>
		</ToolbarGroup>
	);

	// Conditionally include NavMenu sidebar in Plugin only.
	// Optimise for dead code elimination.
	// See https://github.com/WordPress/gutenberg/blob/trunk/docs/how-to-guides/feature-flags.md#dead-code-elimination.
	let MaybeNavMenuSidebarToggle = Fragment;

	if ( process.env.IS_GUTENBERG_PLUGIN ) {
		MaybeNavMenuSidebarToggle = NavMenuSidebarToggle;
	}

	return (
		<BlockEditorProvider
			settings={ settings }
			value={ blocks }
			onInput={ onInput }
			onChange={ onChange }
			useSubRegistry={ false }
		>
			<EditTemplatePartMenuButton />
			<TemplatePartConverter />
			<__experimentalLinkControl.ViewerFill>
				{ useCallback(
					( fillProps ) => (
						<NavigateToLink
							{ ...fillProps }
							activePage={ page }
							onActivePageChange={ setPage }
						/>
					),
					[ page ]
				) }
			</__experimentalLinkControl.ViewerFill>
			<SidebarInspectorFill>
				<BlockInspector />
			</SidebarInspectorFill>
			<BlockTools
				className={ classnames( 'edit-site-visual-editor', {
					'is-focus-mode': isTemplatePart,
				} ) }
				__unstableContentRef={ contentRef }
				onClick={ ( event ) => {
					// Clear selected block when clicking on the gray background.
					if ( event.target === event.currentTarget ) {
						clearSelectedBlock();
					}
				} }
			>
				<BlockEditorKeyboardShortcuts.Register />
				<BackButton />
				<ResizableEditor
					// Reinitialize the editor and reset the states when the template changes.
					key={ templateId }
					enableResizing={
						isTemplatePart &&
						// Disable resizing in mobile viewport.
						! isMobileViewport
					}
					settings={ settings }
					contentRef={ mergedRefs }
				>
					<BlockList
						className="edit-site-block-editor__block-list wp-site-blocks"
						__experimentalLayout={ LAYOUT }
						renderAppender={
							isTemplatePart && hasBlocks
								? false
								: InnerBlocks.ButtonBlockAppender
						}
					/>
				</ResizableEditor>
				<__unstableBlockSettingsMenuFirstItem>
					{ ( { onClose } ) => (
						<BlockInspectorButton onClick={ onClose } />
					) }
				</__unstableBlockSettingsMenuFirstItem>
				<__unstableBlockToolbarLastItem>
					<__unstableBlockNameContext.Consumer>
						{ ( blockName ) =>
							blockName === 'core/navigation' && (
								<MaybeNavMenuSidebarToggle />
							)
						}
					</__unstableBlockNameContext.Consumer>
				</__unstableBlockToolbarLastItem>
			</BlockTools>
			<ReusableBlocksMenuItems />
		</BlockEditorProvider>
	);
}
