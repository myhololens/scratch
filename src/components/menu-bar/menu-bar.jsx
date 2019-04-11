import classNames from 'classnames';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import CommunityButton from './community-button.jsx';
import SaveButton from './save-button.jsx';
import ShareButton from './share-button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import LanguageSelector from '../../containers/language-selector.jsx';
import SaveStatus from './save-status.jsx';
import SBFileUploader from '../../containers/sb-file-uploader.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import AccountNav from '../../containers/account-nav.jsx';
import LoginDropdown from './login-dropdown.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import SB3Saveloader from '../../containers/sb3-saveloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';

import {openTipsLibrary} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {fetch, qs} from '../../utils';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openEditMenu,
    closeEditMenu,
    editMenuOpen,
    openLanguageMenu,
    closeLanguageMenu,
    languageMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen,
    openUserMenu,
    closeUserMenu,
    userMenuOpen,
} from '../../reducers/menus';

import styles from './menu-bar.css';

import helpIcon from '../../lib/assets/icon--tutorials.svg';
import mystuffIcon from './icon--mystuff.png';
import feedbackIcon from './icon--feedback.svg';
import profileIcon from './icon--profile.png';
import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import languageIcon from '../language-selector/language-icon.svg';

import scratchLogo from './scratch-logo.svg';

import sharedMessages from '../../lib/shared-messages';

const ariaMessages = defineMessages({
    language: {
        id: 'gui.menuBar.LanguageSelector',
        defaultMessage: 'language selector',
        description: 'accessibility text for the language selection menu'
    },
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    }
});

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};


MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({id, isRtl, children, className}) => (
    <ComingSoonTooltip
        className={classNames(styles.comingSoon, className)}
        isRtl={isRtl}
        place={isRtl ? 'left' : 'right'}
        tooltipClassName={styles.comingSoonTooltip}
        tooltipId={id}
    >
        {children}
    </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string,
    isRtl: PropTypes.bool
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickNew',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleCloseFileMenuAndThen',
            'handleKeyPress',
            'handleLanguageMouseUp',
            'handleRestoreOption',
            'handleSaveToCloud',
            'handlePushToCloud',
            'restoreOptionMessage'
        ]);

        this.state = {
            nickname: localStorage['nickname'],
        };
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleClickNew () {
        let readyToReplaceProject = true;
        // if the project is dirty, and user owns the project, we will autosave.
        // but if they are not logged in and can't save, user should consider
        // downloading or logging in first.
        // Note that if user is logged in and editing someone else's project,
        // they'll lose their work.
        return location.assign(`${location.origin}${location.pathname}`)
        if (this.props.projectChanged && !this.props.canCreateNew) {
            readyToReplaceProject = confirm( // eslint-disable-line no-alert
                this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
            );
        }
        this.props.onRequestCloseFile();
        if (readyToReplaceProject) {
            this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        }
        this.props.onRequestCloseFile();
    }
    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        this.props.onClickSave();
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.canSave) { // save before transitioning to project page
            this.props.autoUpdateProject();
            waitForUpdate(true); // queue the transition to project page
        } else {
            waitForUpdate(false); // immediately transition to project page
        }
    }
    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) { // save before transitioning to project page
                this.props.onShare();
            }
            if (this.props.canSave) { // save before transitioning to project page
                this.props.autoUpdateProject();
                waitForUpdate(true); // queue the transition to project page
            } else {
                waitForUpdate(false); // immediately transition to project page
            }
        }
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
            this.props.onRequestCloseEdit();
        };
    }
    handleCloseFileMenuAndThen (fn) {
        return () => {
            this.props.onRequestCloseFile();
            fn();
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }
    handleSaveToCloud (projectFilename, projectFilepromise) {
        return () => {
            projectFilepromise.then(sb3 => {
                let form = new FormData()
                    form.append('name', projectFilename)
                    form.append('sb3', sb3)
                    form.append('poster', window._poster)

                if (qs.search['id']) {
                    form.append('id', qs.search['id'])
                }

                fetch({ url: '/api/project/save', body: form, method: 'FORM' }).then(res => {
                    if (res) {
                        alert('保存成功')
                    }
                })
            })
        }
    }
    handlePushToCloud (projectFilename, projectFilepromise) {
        return () => {
            window.plugin.start(), window.plugin.publish = () => {
                projectFilepromise.then(sb3 => {
                    let form = new FormData()
                        form.append('name', projectFilename)
                        form.append('sb3', sb3)
                        form.append('poster', window._poster)
                        form.append('audio',  window._audio)
                        form.append('video',  window._video.compile())

                    if (qs.search['id']) {
                        form.append('id', qs.search['id'])
                    }

                    fetch({ url: '/api/project/push', body: form, method: 'FORM' }).then(res => {
                        if (res) {
                            alert('发布成功')
                        }
                    })
                })
            }
        }
    }
    handleLanguageMouseUp (e) {
        if (!this.props.languageMenuOpen) {
            this.props.onClickLanguage(e);
        }
    }
    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (<FormattedMessage
                defaultMessage="Restore Sprite"
                description="Menu bar item for restoring the last deleted sprite."
                id="gui.menuBar.restoreSprite"
            />);
        case 'Sound':
            return (<FormattedMessage
                defaultMessage="Restore Sound"
                description="Menu bar item for restoring the last deleted sound."
                id="gui.menuBar.restoreSound"
            />);
        case 'Costume':
            return (<FormattedMessage
                defaultMessage="Restore Costume"
                description="Menu bar item for restoring the last deleted costume."
                id="gui.menuBar.restoreCostume"
            />);
        default: {
            return (<FormattedMessage
                defaultMessage="Restore"
                description="Menu bar item for restoring the last deleted item in its disabled state." /* eslint-disable-line max-len */
                id="gui.menuBar.restore"
            />);
        }
        }
    }
    render () {
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );
        const remixButton = (
            <Button
                className={classNames(
                    styles.menuBarButton,
                    styles.remixButton
                )}
                iconClassName={styles.remixButtonIcon}
                iconSrc={remixIcon}
                onClick={this.handleClickRemix}
            >
                {remixMessage}
            </Button>
        );
        return (
            <Box
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
            >
                <div className={styles.mainMenu}>
                    <div className={styles.fileGroup}>
                        {/* logo */}
                        <div className={classNames(styles.menuBarItem)}>
                            <img
                                className={classNames(styles.scratchLogo, {[styles.clickable]: typeof this.props.onClickLogo !== 'undefined'})}
                                src={scratchLogo}
                                draggable={false}
                                onClick={() => {}}
                            />
                        </div>
                        {/* menu */}
                        <div className={classNames(styles.menuBarItem, styles.hoverable, {[styles.active]: this.props.fileMenuOpen})} onMouseUp={this.props.onClickFile}>
                            <FormattedMessage
                                defaultMessage="File"
                                description="Text for file dropdown menu"
                                id="gui.menuBar.file"
                            />
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.fileMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                                onRequestClose={this.props.onRequestCloseFile}
                            >
                                <MenuSection>
                                    <MenuItem isRtl={this.props.isRtl} onClick={this.handleClickNew}>
                                        {newProjectMessage}
                                    </MenuItem>
                                </MenuSection>
                                <MenuSection>
                                    <SBFileUploader onUpdateProjectTitle={this.props.onUpdateProjectTitle}>
                                        {
                                            (className, renderFileInput, loadProject) => (
                                                <MenuItem className={className} onClick={loadProject}>
                                                    <FormattedMessage
                                                        defaultMessage="Load from your computer"
                                                        description="Menu bar item for uploading a project from your computer"
                                                        id="gui.menuBar.uploadFromComputer"
                                                    />
                                                    { renderFileInput() }
                                                </MenuItem>
                                            )
                                        }
                                    </SBFileUploader>
                                    <SB3Downloader>
                                        {
                                            (className, downloadProject) => (
                                                <MenuItem className={className} onClick={this.handleCloseFileMenuAndThen(downloadProject)}>
                                                    <FormattedMessage
                                                        defaultMessage="Save to your computer"
                                                        description="Menu bar item for downloading a project to your computer"
                                                        id="gui.menuBar.downloadToComputer"
                                                    />
                                                </MenuItem>
                                            )
                                        }
                                    </SB3Downloader>
                                </MenuSection>
                            </MenuBarMenu>
                        </div>
                        <div className={classNames(styles.menuBarItem, styles.hoverable, {[styles.active]: this.props.editMenuOpen})} onMouseUp={this.props.onClickEdit}>
                            <div className={classNames(styles.editMenu)}>
                                <FormattedMessage
                                    defaultMessage="Edit"
                                    description="Text for edit dropdown menu"
                                    id="gui.menuBar.edit"
                                />
                            </div>
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.editMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                                onRequestClose={this.props.onRequestCloseEdit}
                            >
                                <DeletionRestorer>
                                    {
                                        (handleRestore, {restorable, deletedItem}) => (
                                            <MenuItem className={classNames({[styles.disabled]: !restorable})} onClick={this.handleRestoreOption(handleRestore)}>
                                                { this.restoreOptionMessage(deletedItem) }
                                            </MenuItem>)
                                    }
                                </DeletionRestorer>
                                <MenuSection>
                                    <TurboMode>
                                        {
                                            (toggleTurboMode, {turboMode}) => (
                                                <MenuItem onClick={toggleTurboMode}>
                                                    {
                                                        turboMode 
                                                        ?
                                                        <FormattedMessage
                                                            defaultMessage="Turn off Turbo Mode"
                                                            description="Menu bar item for turning off turbo mode"
                                                            id="gui.menuBar.turboModeOff"
                                                        />
                                                        :
                                                        <FormattedMessage
                                                            defaultMessage="Turn on Turbo Mode"
                                                            description="Menu bar item for turning on turbo mode"
                                                            id="gui.menuBar.turboModeOn"
                                                        />
                                                    }
                                                </MenuItem>)
                                        }
                                    </TurboMode>
                                </MenuSection>
                            </MenuBarMenu>
                        </div>
                    </div>
                    {
                        this.state.nickname
                        &&
                        <React.Fragment>
                            <Divider className={classNames(styles.divider)} />
                            <div className={classNames(styles.menuBarItem, styles.growable)}>
                                <ProjectTitleInput
                                    className={classNames(styles.titleFieldGrowable)}
                                    onUpdateProjectTitle={this.props.onUpdateProjectTitle}
                                />
                            </div>
                            <div className={classNames(styles.menuBarItem)}>
                                <SB3Saveloader>
                                    {(projectFilename, projectFilepromise) => <SaveButton className={styles.menuBarButton} onClick={this.handleSaveToCloud(projectFilename, projectFilepromise)} />}
                                </SB3Saveloader>
                            </div>
                            <div className={classNames(styles.menuBarItem)}>
                                <SB3Saveloader>
                                    {(projectFilename, projectFilepromise) => <ShareButton className={styles.menuBarButton} onClick={this.handlePushToCloud(projectFilename, projectFilepromise)} />}
                                </SB3Saveloader>
                            </div>
                        </React.Fragment>
                    }
                </div>
                <div className={styles.accountInfoGroup}>
                    {
                        this.state.nickname
                        &&
                        <div style={{ cursor: 'pointer' }} className={classNames(styles.menuBarItem)} onMouseUp={this.props.onClickUser}>
                            <div className={classNames(styles.editMenu)}>
                                <div className={classNames(styles.menuBarItem, styles.hoverable, styles.accountNavMenu)}>
                                    <img
                                        className={styles.profileIcon}
                                        src={profileIcon}
                                    />
                                    <span>
                                        { this.state.nickname }
                                    </span>
                                    <img
                                        className={styles.dropdownCaretIcon}
                                        src={dropdownCaret}
                                    />
                                </div>
                            </div>
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.userMenuOpen}
                                place="left"
                                onRequestClose={this.props.onRequestCloseUser}
                            >
                                <MenuSection>
                                    <MenuItem onClick={() => alert('我的衣服0')}>
                                        我的衣服0
                                    </MenuItem>
                                    <MenuItem onClick={() => alert('我的衣服1')}>
                                        我的衣服1
                                    </MenuItem>
                                    <MenuItem onClick={() => alert('我的衣服2')}>
                                        我的衣服2
                                    </MenuItem>
                                </MenuSection>
                            </MenuBarMenu>
                        </div>
                    }
                </div>
            </Box>
        );
    }
}

MenuBar.propTypes = {
    accountMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    autoUpdateProject: PropTypes.func,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    editMenuOpen: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    intl: intlShape,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isUpdating: PropTypes.bool,
    languageMenuOpen: PropTypes.bool,
    loginMenuOpen: PropTypes.bool,
    userMenuOpen: PropTypes.bool,
    onClickAccount: PropTypes.func,
    onClickEdit: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickLanguage: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickLogo: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseEdit: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseLanguage: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    onUpdateProjectTitle: PropTypes.func,
    projectChanged: PropTypes.bool,
    projectTitle: PropTypes.string,
    renderLogin: PropTypes.func,
    sessionExists: PropTypes.bool,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string
};

MenuBar.defaultProps = {
    onShare: () => {}
};

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    return {
        accountMenuOpen: accountMenuOpen(state),
        fileMenuOpen: fileMenuOpen(state),
        editMenuOpen: editMenuOpen(state),
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        languageMenuOpen: languageMenuOpen(state),
        loginMenuOpen: loginMenuOpen(state),
        userMenuOpen: userMenuOpen(state),
        projectChanged: state.scratchGui.projectChanged,
        projectTitle: state.scratchGui.projectTitle,
        sessionExists: state.session && typeof state.session.session !== 'undefined',
        username: user ? user.username : null
    };
};

const mapDispatchToProps = dispatch => ({
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onClickAccount: () => dispatch(openAccountMenu()),
    onRequestCloseAccount: () => dispatch(closeAccountMenu()),
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickEdit: () => dispatch(openEditMenu()),
    onRequestCloseEdit: () => dispatch(closeEditMenu()),
    onClickLanguage: () => dispatch(openLanguageMenu()),
    onRequestCloseLanguage: () => dispatch(closeLanguageMenu()),
    onClickLogin: () => dispatch(openLoginMenu()),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickUser: () => dispatch(openUserMenu()),
    onRequestCloseUser: () => dispatch(closeUserMenu()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSeeCommunity: () => dispatch(setPlayer(true))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(MenuBar));
