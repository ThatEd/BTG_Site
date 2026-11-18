define(["require", "exports", "common/core/DataStore", "common/core/Localisation", "common/core/System", "common/lib/classnames", "common/lib/preact", "common/util/CSSUtil", "project/components/TeamLogo"], function (require, exports, DS, Localisation_1, System_1, classnames_1, preact, CSSUtil_1, TeamLogo_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TeamCommSkin = void 0;
    (0, CSSUtil_1.loadCSS)('project/components/raceWeekend/driverPanel/teamComms/TeamCommSkin');

    const BAR_HEIGHTS         = [10, 22, 38, 52, 52, 38, 22, 10];
    const BAR_HEIGHTS_REFLECT = [ 6, 12, 20, 28, 28, 20, 12,  6];
    const BAR_DURATIONS       = [0.45, 0.62, 0.38, 0.71, 0.53, 0.44, 0.67, 0.39];
    const BAR_DELAYS          = [0.0,  0.18, 0.33, 0.07, 0.41, 0.25, 0.12, 0.36];
    const REF_DURATIONS       = [0.51, 0.39, 0.68, 0.44, 0.57, 0.72, 0.35, 0.49];
    const REF_DELAYS          = [0.22, 0.41, 0.09, 0.35, 0.16, 0.28, 0.44, 0.13];
    const CHAR_INTERVAL_MS = 35;

    class TeamCommSkin extends preact.Component {
        static defaultProps = {
            showMessage: true,
            showNotification: false,
            driverID: -1,
            messages: [],
        };

        state = {
            revealedChars: 0,
            revealingIdx: -1,
        };

        _revealTimer = null;

        componentWillMount() {
            // Handle case where messages already exist when component first mounts
            const msgs = this.props.messages;
            if (msgs && msgs.length > 0) {
                const lastMsg = msgs[msgs.length - 1];
                this.state.revealedChars = 1;
                this.state.revealingIdx = msgs.length - 1;
                this._startReveal(lastMsg.text.length, 1);
            }
        }

        componentWillReceiveProps(nextProps) {
            const msgs = nextProps.messages;
            if (!msgs || msgs.length === 0) return;

            const lastMsg = msgs[msgs.length - 1];
            const prevMsgs = this.props.messages;
            const prevLast = prevMsgs && prevMsgs.length > 0 ? prevMsgs[prevMsgs.length - 1] : null;

            if (!prevLast || lastMsg.text !== prevLast.text) {
                const isFirst = !prevLast;
                const startFrom = prevLast && prevLast.staffID === lastMsg.staffID
                    ? prevLast.text.length
                    : 0;
                const totalLen = lastMsg.text.length;

                if (isFirst) {
                    // Directly mutate state before render so first char is visible immediately
                    this.state.revealedChars = 1;
                    this.state.revealingIdx = msgs.length - 1;
                    this._startReveal(totalLen, 1);
                    // Force a re-render
                    this.enqueueForceUpdate();
                } else {
                    this.setState({ revealedChars: startFrom, revealingIdx: msgs.length - 1 });
                    this._startReveal(totalLen, startFrom);
                }
            }
        }

        componentWillUnmount() {
            this._clearReveal();
        }

        _clearReveal() {
            if (this._revealTimer) { clearInterval(this._revealTimer); this._revealTimer = null; }
        }

        _startReveal(totalChars, startFrom) {
            this._clearReveal();
            let count = startFrom;
            this._revealTimer = setInterval(() => {
                count++;
                this.setState({ revealedChars: count });
                if (count >= totalChars) this._clearReveal();
            }, CHAR_INTERVAL_MS);
        }

        render(props, state) {
            const { children, rootClassName, modifiers, showMessage, showNotification, messages } = props;
            const isLogographic = System_1.LogographicLanguages.includes((0, System_1.getLanguage)());
            const collapsed = !showMessage ? 'collapsed' : '';

            const driverDataCtx  = ['DriverData', props.driverID + ''];
            const driverStaffID  = DS.getValue(driverDataCtx, 'staffID');
            const teamID         = DS.getValue(driverDataCtx, 'teamID');
            const staffCtx       = ['Staff', driverStaffID + ''];
            const driverLastName = DS.getValue(staffCtx, 'lastName');
            const driverNumber   = DS.getValue(staffCtx, 'driverNumber');

            const teamModifier = teamID > 0 ? 'team' + teamID : '';
            const allModifiers = (0, classnames_1.classNames)(modifiers, teamModifier);

            const bars = BAR_HEIGHTS.map((h, i) =>
                preact.h('div', { className: 'TeamCommSkin_waveBarWrap', style: { flex: 1, height: (h * 0.0555555556) + 'rem' } },
                    preact.h('div', {
                        className: 'TeamCommSkin_waveBar',
                        style: {
                            animationDuration: BAR_DURATIONS[i] + 's',
                            animationDelay: BAR_DELAYS[i] + 's',
                            position: 'relative',
                        }
                    },
                        preact.h('div', { className: 'TeamCommSkin_waveBarStripe' }),
                        preact.h('div', { className: 'TeamCommSkin_waveBarStripeHide' })
                    )
                )
            );

            const reflectBars = BAR_HEIGHTS_REFLECT.map((h, i) =>
                preact.h('div', { className: 'TeamCommSkin_waveBarReflectWrap', style: { flex: 1, height: (h * 0.0555555556) + 'rem' } },
                    preact.h('div', {
                        className: 'TeamCommSkin_waveBarReflect',
                        style: {
                            animationDuration: REF_DURATIONS[i] + 's',
                            animationDelay: REF_DELAYS[i] + 's',
                        }
                    })
                )
            );

            const { revealedChars } = state;
            const messageRows = (messages || []).map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const displayText = !isLast ? msg.text : msg.text.slice(0, revealedChars);
                return preact.h('div', {
                    key: idx,
                    className: (0, classnames_1.classNames)('TeamCommSkin_text', {
                        'logographic': isLogographic,
                        'isDriver': msg.isDriver,
                        'isPrev': !isLast,
                    })
                }, displayText);
            });

            return preact.h('div', { className: (0, classnames_1.classNames)('TeamCommSkin_root', rootClassName, allModifiers, collapsed) },

                preact.h('div', { className: 'TeamCommSkin_top' },
                    driverLastName &&
                        preact.h('div', { className: (0, classnames_1.classNames)('TeamCommSkin_driverName', allModifiers) },
                            (0, Localisation_1.translate)(driverLastName)
                        ),
                    preact.h('div', { className: 'TeamCommSkin_radioLabel' }, 'RADIO')
                ),

                preact.h('div', { className: (0, classnames_1.classNames)('TeamCommSkin_mid', allModifiers) },
                    preact.h('div', { className: 'TeamCommSkin_midTop' },
                        preact.h('div', { className: 'TeamCommSkin_posBlock' },
                            preact.h('div', { className: 'TeamCommSkin_position' },
                                driverNumber != null ? driverNumber : ''
                            )
                        )
                    ),
                    teamID > 0 &&
                        preact.h(TeamLogo_1.TeamLogoSmall, { team: teamID, rootClassName: 'TeamCommSkin_teamLogo' }),
                    preact.h('div', { className: 'TeamCommSkin_waveArea' },
                        preact.h('div', { className: 'TeamCommSkin_waveTop' }, ...bars),
                        preact.h('div', { className: 'TeamCommSkin_waveBottom' }, ...reflectBars),
                        preact.h('div', { className: 'TeamCommSkin_waveFadeTop' }),
                        preact.h('div', { className: 'TeamCommSkin_waveFadeBottom' })
                    )
                ),

                messages && messages.length > 0 &&
                    preact.h('div', { className: 'TeamCommSkin_bottom' },
                        ...messageRows,
                        showNotification &&
                            preact.h('div', { className: 'TeamCommSkin_notificationIcon' })
                    ),

                preact.h('div', { className: (0, classnames_1.classNames)('TeamCommSkin_container', allModifiers) },
                    children
                )
            );
        }
    }
    exports.TeamCommSkin = TeamCommSkin;
});
//# sourceMappingURL=TeamCommSkin.js.map
