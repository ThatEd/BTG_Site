define(["require", "exports", "common/components/FDiv", "common/components/Focusable", "common/core/Audio", "common/core/DataStore", "common/core/Engine", "common/core/Focus", "common/core/InputTypes", "common/core/Localisation", "common/data/DataStoreCollectionEx", "common/lib/classnames", "common/lib/preact", "common/util/CSSUtil", "common/util/DataStoreHelper", "project/apps/RaceWeekendApp", "project/components/Button", "project/data/GameTypes", "project/modules/comms/data/CommsNotificationModel", "project/modules/raceWeekend/DriverPanel", "project/modules/raceWeekend/driverPanel/teamComms/TeamCommSkin", "project/modules/raceWeekend/RaceWeekendEvents", "project/modules/raceWeekend/utils/ContextUtil", "project/modules/raceWeekend/utils/TeamCommsUtil", "project/utils/VoltaModuleFocusPriority", "project/modules/raceWeekend/driverPanel/teamComms/BtgRadio"], function (require, exports, FDiv_1, Focusable, Audio, DS, Engine_1, Focus, InputTypes_1, Localisation_1, DataStoreCollectionEx_1, classnames_1, preact, CSSUtil_1, DataStoreHelper_1, RaceWeekendApp_1, Button_1, GameTypes_1, CommsNotificationModel_1, DriverPanel_1, TeamCommSkin_1, RaceWeekendEvents_1, ContextUtil_1, TeamCommsUtil_1, VoltaModuleFocusPriority_1, BtgRadio_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TeamComm = void 0;
    (0, CSSUtil_1.loadCSS)('project/components/raceWeekend/driverPanel/teamComms/TeamComm');
    class _TeamComm extends preact.Component {
        _collection = new DataStoreCollectionEx_1.DataStoreCollectionEx();
        _commsModel = new CommsNotificationModel_1.CommsNotificationModel();
        _helper = new DataStoreHelper_1.DataStoreHelper();
        _restoredPageIndex = -1;
        _selectButtonFK = Symbol('TeamComm:SelectButton');
        _cancelButtonFK = Symbol('TeamComm:CancelButton');
        static defaultProps = {
            componentName: 'TeamComm',
        };
        state = {
            carID: -1,
            driverID: -1,
            driverGender: 0,
            eventType: -1,
            dilemma: GameTypes_1.ECommsDilemma.NONE,
            displayType: null,
            isPaused: false,
            commKey: 0,
            // Message history managed here so we have full session control
            messages: [],
            lastRawText: null,
            lastStaffID: null,
        };
        componentWillMount() {
            try { BtgRadio_1.start(Audio); } catch (e) { } // BTG: live radio pop-up (Audio: for its sound)
            this._collection.onDecorateItem = this.onDecorateItem;
            this._collection.onChange.add(this.onCommsData);
            this._commsModel.onBeginPage.add(this.updateComm);
            this._commsModel.onEndAllPages.add(this.onCommEnded);
            (0, Engine_1.addListener)('ShowTeamComms', this.handleComm);
            const carID = DS.getValue(this.props.context, 'index');
            const driverID = DS.getValue(this.props.context, 'driverIndex');
            const staffID = DS.getValue(['DriverData', driverID + ''], 'staffID');
            const driverGender = DS.getValue(['Staff', staffID + ''], 'gender') ?? 0;
            this.setState({ carID, driverID, driverGender });
            const persistentState = RaceWeekendApp_1.persistentScreenData.getAllStatesForId(RaceWeekendApp_1.PersistentDataOwners.TeamComms);
            if (persistentState) {
                const savedComm = this.getSavedComm();
                if (savedComm) {
                    const savedCommID = DS.getValue(savedComm.context, 'id');
                    if (savedCommID) {
                        this.handleComm(savedComm.context, savedComm.paused);
                        this._restoredPageIndex = savedComm.pageIndex;
                        if (savedComm.paused) {
                            (0, RaceWeekendEvents_1.SimPauseChange)(true, GameTypes_1.PauseLayer.Notifications);
                        }
                    }
                    else {
                        this.setSavedComm(undefined);
                        this._restoredPageIndex = -1;
                    }
                }
            }
        }
        componentWillReceiveProps(nextProps) {
            if (nextProps.showOptionsMenu != this.props.showOptionsMenu) {
                nextProps.showOptionsMenu ? this._commsModel.pause() : this._commsModel.resume();
            }
        }
        componentWillUnmount() {
            try { BtgRadio_1.stop(); } catch (e) { } // BTG: live radio pop-up
            this._collection.dispose();
            this._commsModel.dispose();
            this._helper.clear();
            (0, Engine_1.removeListener)('ShowTeamComms', this.handleComm);
        }
        render(props, state) {
            const { rootClassName } = props;
            const { eventType, dilemma, displayType, isPaused, driverGender, messages } = state;
            const page = this._commsModel.getCurrPage();
            if (page !== null && eventType !== -1) {
                const commsContext = page.context.slice(0, 3);
                this.setSavedComm({
                    context: commsContext,
                    pageIndex: this._commsModel.currPageIndex,
                    paused: isPaused,
                });
                let { modifiers, typeLabel } = (0, TeamCommsUtil_1.getCommsDisplayData)(eventType, displayType, isPaused, dilemma, driverGender);
                const buttonLabel = this.getButtonLabel(dilemma);
                modifiers = (0, classnames_1.classNames)(props.modifiers, modifiers, props.context[props.context.length - 1], {
                    'isVoiced': page.isVoiced
                });
                const showMessage = page.text != '[STRING_LITERAL:Value=||]'
                    && (!!this.props.onToggleDilemma || !isPaused);
                let text = `[TEAM_COMMS_TEXT:LastName=${page.staffLastName}:Text=${page.text}]`;
                if ((0, Engine_1.isCoherentPlayer)()) {
                    text = page.text;
                }
                const focusPriority = (0, ContextUtil_1.getUIPlayerCarFromContext)(props.context) === 1
                    ? VoltaModuleFocusPriority_1.VoltaModuleFocusPriority.TeamCommDriver1
                    : VoltaModuleFocusPriority_1.VoltaModuleFocusPriority.TeamCommDriver2;
                return (preact.h(TeamCommSkin_1.TeamCommSkin, { modifiers: (0, classnames_1.classNames)(rootClassName, modifiers, (buttonLabel !== '') && 'paused'), showMessage: showMessage, staffID: page.staffID, driverID: this.state.driverID, text: text, rawText: page.text, typeLabel: typeLabel, messages: messages }, buttonLabel !== '' &&
                    preact.h(FDiv_1.FDiv, { rootClassName: 'TeamCommSkin_buttons', focusableIfEmpty: true, focusBarrier: Focus.Barrier.Hover_Spatial, focusModulePriority: focusPriority },
                        preact.h(Button_1.Button, { rootClassName: 'TeamCommSkin_topButton', modifiers: 'header18Label mouseOnly', moduleName: 'TeamComm', outcome: "confirm" + '_' + GameTypes_1.ECommsDilemma[dilemma], focusable: false, manualFocusKey: this._selectButtonFK, label: buttonLabel, alwaysShowInputIcon: props.hasFocusedDescendant, onSelect: this.onSelectAction }),
                        preact.h(Button_1.Button, { modifiers: 'header18Label mouseOnly', moduleName: 'TeamComm', outcome: "cancel" + '_' + GameTypes_1.ECommsDilemma[dilemma], focusable: false, manualFocusKey: this._cancelButtonFK, label: '[TEAM_COMMS_ACTION_IGNORE]', inputName: InputTypes_1.InputName.Cancel, alwaysShowInputIcon: props.hasFocusedDescendant, onSelect: this.onIgnoreAction }))));
            }
            else {
                this.setSavedComm(undefined);
            }
            return null;
        }
        handleInput(e) {
            return Focus.getFocusable(this._selectButtonFK)?.handleInput(e)
                || Focus.getFocusable(this._cancelButtonFK)?.handleInput(e)
                || false;
        }
        handleComm = (commCtx, isPaused) => {
            const commReceiverCarID = DS.getValue(commCtx, 'commReceiverCarID');
            this.setSavedComm(undefined);
            if (commReceiverCarID === this.state.carID || commReceiverCarID === -1) {
                this._collection.dispose();
                this._collection.onChange.add(this.onCommsData);
                this._collection.bindToContext([...commCtx, 'PagesCar', this.state.carID + ''], 'sortField');
                let dilemma = GameTypes_1.ECommsDilemma.NONE;
                const eventType = DS.getValue(commCtx, 'type');
                const displayType = DS.getValue(commCtx, 'commsDisplayType');
                if (this.props.onToggleDilemma && isPaused) {
                    dilemma = DS.getValue(commCtx, 'dilemma');
                }
                // New session — clear message history
                this.setState({ eventType, dilemma, displayType, messages: [], lastRawText: null, lastStaffID: null });
                Audio.onAction(this, "show", "initiate");
            }
            this.setState({ isPaused });
        };
        onCommsData = () => {
            this._commsModel.setPagesData(this._collection.source);
            if (this._restoredPageIndex >= 0) {
                this._commsModel.gotoAndPlay(this._restoredPageIndex);
                this._restoredPageIndex = -1;
            }
            else {
                this._commsModel.nextPage();
            }
            const page = this._commsModel.getCurrPage();
            if (this.props.onToggleDilemma && page != null) {
                if (this.state.isPaused) {
                    this.props.onToggleDilemma(this.state.displayType, this.state.dilemma);
                }
                else {
                    this.props.onToggleDilemma(GameTypes_1.ETeamCommsUIDisplayType.Miscelaneous, this.state.dilemma);
                }
            }
        };
        updateComm = () => {
            const page = this._commsModel.getCurrPage();
            if (page && page.text && page.text !== '||' && page.text !== this.state.lastRawText) {
                const rawText = page.text;
                const staffID = page.staffID;
                const isDriver = DS.getValue(['Staff', staffID + ''], 'driverNumber') != null;
                // Sanitise text — replace smart quotes and apostrophes with basic equivalents
                const sanitised = (0, Localisation_1.translate)(rawText)
                    .replace(/[\u2018\u2019\u02BC]/g, "'")
                    .replace(/[\u201C\u201D]/g, '"')
                    .replace(/[\u2013\u2014]/g, '-');
                const fullText = '"' + sanitised + '"';
                const msgs = this.state.messages;
                let newMessages;
                if (msgs.length > 0 && msgs[msgs.length - 1].staffID === staffID) {
                    const prev = msgs[msgs.length - 1].text.replace(/^"|"$/g, '');
                    const next = fullText.replace(/^"|"$/g, '');
                    const combined = '"' + prev + ' ' + next + '"';
                    newMessages = [...msgs.slice(0, -1), { text: combined, isDriver, staffID }];
                } else {
                    newMessages = [...msgs, { text: fullText, isDriver, staffID }].slice(-2);
                }
                this.setState({ messages: newMessages, lastRawText: rawText, lastStaffID: staffID });
            } else {
                this.enqueueForceUpdate();
            }
        };
        clearComm = () => {
            this.setState({ eventType: -1, dilemma: GameTypes_1.ECommsDilemma.NONE, messages: [], lastRawText: null, lastStaffID: null });
            this._collection.dispose();
            this.props.onToggleDilemma?.(null, GameTypes_1.ECommsDilemma.NONE);
            this.setSavedComm(undefined);
        };
        getSavedComm() {
            const persistentState = RaceWeekendApp_1.persistentScreenData.getAllStatesForId(RaceWeekendApp_1.PersistentDataOwners.TeamComms);
            if (persistentState) {
                const playerCar = (0, ContextUtil_1.getUIPlayerCarFromContext)(this.props.context);
                return playerCar == 2 ? persistentState.savedComm2 : persistentState.savedComm1;
            }
        }
        setSavedComm(comm) {
            const playerCar = (0, ContextUtil_1.getUIPlayerCarFromContext)(this.props.context);
            RaceWeekendApp_1.persistentScreenData.setStateForId(RaceWeekendApp_1.PersistentDataOwners.TeamComms, playerCar == 2 ? 'savedComm2' : 'savedComm1', comm);
        }
        onSelectAction = () => {
            (0, Engine_1.sendEvent)('CommsResponse', this.state.carID, true, this.state.dilemma);
            Audio.onAction(this, "hide", "navigate");
            this.clearComm();
        };
        onIgnoreAction = () => {
            (0, Engine_1.sendEvent)('CommsResponse', this.state.carID, false, this.state.dilemma);
            Audio.onAction(this, "hide", "cancel");
            this.clearComm();
        };
        onCommEnded = () => {
            if (!this.state.isPaused) {
                Audio.onAction(this, "hide");
                this.clearComm();
            }
        };
        onDecorateItem = (page) => {
            page.duration = DS.getValue(page.context, 'duration') ?? 3000;
            page.isVoiced = DS.getValue(page.context, 'isVoiced') ?? false;
            page.staffID = DS.getValue(page.context, 'staffID') ?? 0;
            page.staffLastName = DS.getValue(['Staff', page.staffID + ''], 'lastName') ?? '||';
            page.text = DS.getValue(page.context, 'text') ?? '||';
        };
        getButtonLabel(dilemma) {
            let buttonLabel = '';
            switch (dilemma) {
                case GameTypes_1.ECommsDilemma.PitOptions:
                case GameTypes_1.ECommsDilemma.TyreOptions:
                    buttonLabel = '[TEAM_COMMS_ACTION_PIT_OPTIONS]';
                    break;
                case GameTypes_1.ECommsDilemma.PaceOptions:
                    buttonLabel = '[TEAM_COMMS_ACTION_PACE]';
                    break;
                case GameTypes_1.ECommsDilemma.LiftAndCoast:
                    buttonLabel = '[TEAM_COMMS_ACTION_LIFT_AND_COAST]';
                    break;
                case GameTypes_1.ECommsDilemma.ERSMode:
                    buttonLabel = '[TEAM_COMMS_ACTION_ERS]';
                    break;
                case GameTypes_1.ECommsDilemma.SendOut:
                    buttonLabel = '[TEAM_COMMS_ACTION_SEND_OUT]';
                    break;
                case GameTypes_1.ECommsDilemma.CallIn:
                    buttonLabel = '[TEAM_COMMS_ACTION_CALL_IN]';
                    break;
            }
            return buttonLabel;
        }
    }
    exports.TeamComm = Focusable.decorateEx(_TeamComm);
});
//# sourceMappingURL=TeamComm.js.map
