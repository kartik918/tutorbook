/**
 * Package containing all of the app's dialog views (both full-screen dialogs
 * like the 
 * [ViewRequestDialog]{@link module:@tutorbook/dialogs~ViewRequestDialog} 
 * or pop-up dialogs like the 
 * [ConfirmationDialog]{@link module:@tutorbook/dialogs~ConfirmationDialog}).
 * @module @tutorbook/dialogs
 * @see {@link https://npmjs.com/package/@tutorbook/dialogs}
 *
 * @license
 * Copyright (C) 2020 Tutorbook
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see {@link https://www.gnu.org/licenses/}.
 */

import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCDialog
} from '@material/dialog/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCFormField
} from '@material/form-field/index';
import {
    MDCCheckbox
} from '@material/checkbox/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');
const CaptureProofDialog = require('@tutorbook/time-requests').capture;
const NewTimeRequestDialog = require('@tutorbook/time-requests').new;

/**
 * Class that represents the dialog that enables users to select subjects.
 * @abstract
 */
class SubjectSelectDialog {

    /**
     * Creates and renders a new subject selection dialog.
     */
    constructor() {
        this.render = window.app.render;
        this.selected = [];
        this.original = [];
        this.renderSelf();
    }

    /**
     * Adds the dialog element to the DOM, opens it, and manages it.
     * @example
     * const SubjectSelectDialog = require('@tutorbook/dialogs').subject;
     * const dialog = new SubjectSelectDialog();
     * dialog.view();
     */
    view() {
        $('body').prepend(this.main);
        if (!this.managed) this.manage();
        this.dialog.open();
    }

    /**
     * Attaches MDC components and click listeners by:
     * 1. Creating a `MDCDialog` instance on `this.main` and listening for when
     * it is closed (update the profile if the user clicked `Save` or reset the
     * dialog if the user clicked `Cancel`).
     * 2. Adding `MDCRipple`s and click listeners to each `mdc-list-item` in the
     * dialog's `page-all` that open the relevant page.
     * 3. Adding `MDCRipple`s, `MDCCheckbox`es and click listeners to each
     * `mdc-list-item` in every other dialog page (clickers that update the
     * selected subjects).
     */
    manage() {
        this.managed = true;
        this.dialog = MDCDialog.attachTo(this.main);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closing', event => {
            if (event.detail.action === 'save') return this.save();
            this.reset();
        });
        this.section('page-all');

        const that = this;
        const boxes = this.checkboxes = {};
        const subjects = this.original;
        const select = (v, a) => this.updateSelected(v, a);
        const view = (id) => this.section(id.split('-').slice(1).join('-'));

        $(document).keydown(event => {
            if (event.keyCode === 16) this.shiftKeyPressed = true;
        });
        $(document).keyup(event => {
            if (event.keyCode === 16) this.shiftKeyPressed = false;
        });

        $(this.main).find('#page-all .mdc-list-item').each(function() {
            this.addEventListener('click', () => view(this.id));
            MDCRipple.attachTo(this);
        });
        this.pages.forEach(sel => {
            if (sel.id.split('-')[1] === 'all') return;
            $(sel).find('.mdc-list-item').each(function() {
                const val = $(this).find('label').text();
                boxes[val] = new MDCCheckbox($(this).find('.mdc-checkbox')[0]);
                boxes[val].checked = subjects.indexOf(val) >= 0;
                this.addEventListener('click', event => {
                    if (!$(event.target).closest('.mdc-checkbox').length)
                        boxes[val].checked = !boxes[val].checked;
                    const category = $(this).parent().parent().attr('id')
                        .split('-')[0];
                    const index = Data[category + 'Subjects'].indexOf(val);
                    if (that.shiftKeyPressed &&
                        that.lastClickedCategory === category &&
                        that.lastClickedIndex !== index) {
                        const start = that.lastClickedIndex > index ? index :
                            that.lastClickedIndex;
                        const end = that.lastClickedIndex < index ? index :
                            that.lastClickedIndex;
                        const selected = Data[category + 'Subjects']
                            .slice(start, end + 1);
                        selected.forEach(v => {
                            boxes[v].checked = boxes[val].checked;
                            select(v, boxes[v].checked);
                        });
                    } else {
                        select(val, boxes[val].checked);
                    }
                    that.lastClickedIndex = index;
                    that.lastClickedCategory = category;
                });
                MDCRipple.attachTo(this);
            });
        });
    }

    /**
     * Resets the checked items to ensure that only selected subjects are
     * checked (and resets `this.selected` to match `this.original`).
     */
    reset() {
        const boxes = this.checkboxes;
        const subjects = this.selected = this.original.map(i => i);

        this.pages.forEach(sel => {
            if (sel.id.split('-')[1] === 'all') return;
            $(sel).find('.mdc-list-item').each(function() {
                const val = $(this).find('label').text();
                boxes[val].checked = subjects.indexOf(val) >= 0;
            });
        });
    }

    /**
     * Should save the selected subjects to their desired destination.
     * @abstract
     */
    save() {
        this.original = this.selected.map(i => i);
    }

    /**
     * Updates the selected subject.
     * @param {string} val - The new selected subject.
     * @param {bool} [add=true] - Whether to add (`true`) or remove (`false`)
     * the given `val`.
     * @example
     * this.updateSelected('Chemistry H'); // From within a subject select 
     * // dialog instance (i.e. `this` is a `SubjectSelectDialog`).
     * @example
     * this.updateSelected('Algebra 1', false); // Remove Algebra 1 from the
     * // selected subjects.
     * @abstract
     */
    updateSelected(val, add = true) {
        if (add) return this.selected.push(val);
        this.selected.splice(this.selected.indexOf(val), 1);
    }

    /**
     * Views a given dialog page/section.
     * @param {string} id - The ID attribute of the page/section to view.
     * @example
     * this.section('page-all'); // View the subject categories page.
     * @example
     * this.section('page-math'); // View the math subjects page.
     */
    section(id) {
        this.pages.forEach((sel) => {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
            this.dialog.layout();
        });
    }

    /**
     * Renders the options list (to replace the placeholder pages).
     * @param {string[]} options - The array of options that the user can select
     * from (i.e. the options to be included in the rendered list).
     * @return {HTMLElement} The rendered `dialog-filter-item-list`.
     */
    renderList(options) {
        return this.render.template('dialog-filter-item-list', {
            items: options,
        });
    }

    /**
     * Renders the subject selection dialog by replacing the subject lists in 
     * the `dialog-subjects` template.
     * @see {@link Templates}
     * @see {@link Render}
     */
    renderSelf() {
        this.main = this.render.template('dialog-subjects', {
            back: () => this.section('page-all'),
        });
        this.pages = this.main.querySelectorAll('.page');

        const l = (q, d) => Utils.replaceElement($(this.main).find(q)[0], this
            .renderList(d));

        l('#math-list', Data.mathSubjects);
        l('#science-list', Data.scienceSubjects);
        l('#history-list', Data.historySubjects);
        l('#language-list', Data.languageSubjects);
        l('#english-list', Data.englishSubjects);
        l('#tech-list', Data.techSubjects);
        l('#art-list', Data.artSubjects);
        l('#life-skills-list', Data.lifeSkills);
    }
};

/**
 * Class that represents the dialog that enables users to edit the subjects for 
 * their (or another user's) profile.
 * @example
 * const EditSubjectsDialog = require('@tutorbook/dialogs').editSubject;
 * const dialog = new EditSubjectsDialog(
 *   $(this.main).find('#Subject').first()[0], 
 *   this.profile,
 * );
 * dialog.view();
 * @todo Make it easier to select subjects in bulk.
 * @todo Add intelligent subject selection (e.g. if someone can tutor Calculus,
 * they can probably tutor Algebra 1 and 2).
 * @extends SubjectSelectDialog
 */
class EditSubjectsDialog extends SubjectSelectDialog {
    /**
     * Creates the dialog that selects the subject to populate a given 
     * [`MDCTextField`]{@linkcode https://material.io/develop/web/components/input-controls/text-field/}.
     * @param {Profile} profile - The profile view to update the subjects for.
     * @param {bool} [update=true] - Whether to update the profile's Firestore
     * document (i.e. for the regular profile view) or to just update the 
     * profile's subjects array locally.
     */
    constructor(profile, update = true) {
        super();
        this.selected = profile.profile.subjects;
        this.original = profile.profile.subjects.map(i => i);
        this.el = profile.main;
        this.update = update;
    }

    /**
     * Updates the profile view subject inputs to match the currently selected 
     * subjects.
     */
    save() {
        super.save();

        $(this.el).find('[id="Subject"]').parent().remove();

        const viewDialog = () => this.view();
        const a = (e, el) => $(this.render.splitListItem(e, el)).insertBefore(
            $(this.el).find('#Availability'));
        const t = (l, v) => this.render.textField(l, v);

        for (var i = 0; i < this.selected.length; i += 2) {
            var subA = this.selected[i];
            var subB = this.selected[i + 1] || '';
            a(t('Subject', subA), t('Subject', subB));
        }

        $(this.el).find('[id="Subject"]').each(function() {
            MDCTextField.attachTo(this);
            this.addEventListener('click', () => viewDialog());
        });

        if (this.update) EditSubjectsDialog.updateSubjects();
    }

    /**
     * Renders an options list that enables the user to select multiple subjects
     * at the same time (via [`MDCCheckboxes`]{@linkcode https://material.io/develop/web/components/input-controls/checkboxes/}).
     * @param {string[]} options - The options that the user can select from.
     * @return {HTMLElement} The rendered checkbox list that enables users to
     * select multiple subjects/options at the same time.
     */
    renderList(options) {
        return this.render.template('dialog-selection-item-list', {
            items: options,
        });
    }

    /**
     * Updates the subjects of the given profile with the content of the
     * currently viewed subject text fields.
     * @param {Profile} [profile=window.app.user] - The profile to put the 
     * subjects 
     * into (if it's not given, we default to `window.app.user` and update the
     * user's Firestore document as well).
     */
    static async updateSubjects(profile) {
        const user = profile || window.app.user;
        user.subjects = [];
        $('#Subject input').each(function(i) {
            if (Data.subjects.indexOf($(this).val()) >= 0)
                user.subjects.push($(this).val());
        });
        Utils.updateSetupProfileCard(user);
        if (profile) return;
        await window.app.updateUser();
        window.app.snackbar.view('Subjects updated.');
    }
};

/**
 * Class representing the "Edit Availability" dialog that enables users to set
 * when they are available for tutoring appointments.
 * @todo Make it faster to select larger windows of time across the week. We
 * want all availability selection to take less than five seconds.
 * @todo Finish documenting all of this class's methods.
 */
class EditAvailabilityDialog {

    /**
     * Creates a new "Edit Availability" dialog that updates the given text
     * field's value and update the profile (if given).
     * @param {HTMLElement} textFieldEl - The 
     * [`MDCTextField`]{@link https://material.io/develop/web/components/input-controls/text-field/} 
     * element to get the currently selected value from (and to update when
     * the user finishes selecting their availability on the dialog).
     * @param {Profile} profile - The user profile to update.
     */
    constructor(textFieldEl, profile) {
        this.string = $(textFieldEl).find('input').val();
        // parseAvailabilityString throws an Error if the string is empty unless
        // we specify openingDialog=true (last arg given down below).
        this.val = Utils.parseAvailabilityString(this.string, true);
        this.input = textFieldEl;
        this.utils = window.app.utils;
        this.render = window.app.render;
        this.data = window.app.data; // TODO: Update location data?
        this.profile = profile;
        if (!this.val.location && this.data.locationNames.length === 1)
            this.val.location = this.data.locationNames[0];
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.main);
        this.dialog = MDCDialog.attachTo(this.main);
        this.dialog.open();
        if (!this.managed) this.manage();
    }

    manage() {
        this.managed = true;
        const that = this;

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };

        function a(q, action) { // Attaches select and adds listener
            return listen(s(q), action);
        };

        $(this.main).find('.mdc-select .mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
        this.locationSelect = a('#Location', (s) => {
            if (s.value === 'Custom') {
                $(this.main).find('#Location').replaceWith(
                    this.render.locationInput((val) => {
                        this.val.location = val.formatted_address;
                    })
                );
            } else {
                this.val.location = s.value;
                this.refreshDaysAndTimes();
            }
        });
        this.daySelect = a('#Day', (s) => {
            this.val.day = s.value;
            this.refreshTimes();
        });
        this.timeslotSelect = a('#Time', (s) => {
            if (s.value.split(' to ').length > 1) {
                this.val.fromTime = s.value.split(' to ')[0];
                this.val.toTime = s.value.split(' to ')[1];
            } else {
                this.val.fromTime = s.value;
                this.val.toTime = s.value;
            }
            this.val.time = s.value;
        });

        if (this.val.location) this.refreshDaysAndTimes();
        if (!$(this.main).find('#ok-button').length) return;

        $(this.main).find('#ok-button')[0].addEventListener('click', () => {
            if (this.valid) this.dialog.close('ok');
        });
        this.dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'ok') {
                $(this.input).find('input')
                    .val(Utils.getAvailabilityString(this.val)).focus();
                EditAvailabilityDialog.updateAvailability(this.profile);
                $(this.main).remove();
            }
        });
    }

    // TODO: What are the MDC guidelines for styling inputs as invalid? Should
    // we only style when the user tries to submit the form? Or as the user is
    // filling out the form?
    get valid() {

        function invalid(select) {
            select.required = true;
            select.valid = false;
        };

        var valid = true;
        if (this.val.location === '') {
            invalid(this.locationSelect);
            valid = false;
        }
        if (this.val.day === '') {
            invalid(this.daySelect);
            valid = false;
        }
        if (this.val.toTime === '' || this.val.fromTime === '') {
            invalid(this.timeslotSelect);
            valid = false;
        }
        return valid;
    }

    static async updateAvailability(profile) {
        // NOTE: Availability is stored in the Firestore database as:
        // availability: {
        //   Gunn Library: {
        //     Friday: [
        //       { open: '10:00 AM', close: '3:00 PM' },
        //       { open: '10:00 AM', close: '3:00 PM' },
        //     ],
        //   }
        //   ...
        // };
        // First, create an array of all the displayed availability strings
        var strings = [];
        $('[id="Available"]').each(function(i) {
            if ($(this).find('input').val() !== '') {
                strings.push($(this).find('input').val());
            }
        });

        const user = profile || window.app.user;
        user.availability = Utils.parseAvailabilityStrings(strings);
        Utils.updateSetupProfileCard(user);
        if (profile) return;
        await window.app.updateUser();
        window.app.snackbar.view('Availability updated.');
    }

    refreshTimes() { // Update time selects based on newly selected day
        const location = this.data.locationDataByName[this.val.location];
        if (!location) return console.warn('[WARNING] Cannot refresh days and' +
            ' times w/out location data.');
        const times = this.utils.getLocationTimeWindowsByDay(
            this.val.day,
            location.hours,
        );
        const timeStrings = times.map(t => t.open !== t.close ? t.open +
            ' to ' + t.close : t.open);
        const that = this;

        if (times.length === 1) { // Only one available option (pre-select it)
            this.val.fromTime = times[0].open;
            this.val.toTime = times[0].close;
            this.val.time = timeStrings[0];
        } else if (times.length < 1) { // No available options
            return window.app.snackbar.view(location.name + ' does not have ' +
                'any open hours.');
        } else if (timeStrings.indexOf(this.val.time) < 0) {
            this.val.fromTime = '';
            this.val.toTime = '';
            this.val.time = '';
        }

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };

        function a(q, action) { // Attaches select and adds listener
            return listen(s(q), action);
        };

        function r(q, el, action, id = 'timeslotSelect') { // Replaces select, 
            // adds listener, and stores select for validation purposes.
            $(el).find('.mdc-list-item').each(function() {
                MDCRipple.attachTo(this);
            });
            $(that.main).find(q).replaceWith(el);
            that[id] = a(q, action);
        };

        r(
            '#Time',
            that.render.select('Time', that.val.time, timeStrings),
            (s) => {
                if (s.value.split(' to ').length > 1) {
                    that.val.fromTime = s.value.split(' to ')[0];
                    that.val.toTime = s.value.split(' to ')[1];
                } else {
                    that.val.fromTime = s.value;
                    that.val.toTime = s.value;
                }
                that.val.time = s.value;
            }
        );
    }

    refreshDaysAndTimes() { // Update day and time selects based on location
        const location = this.data.locationDataByName[this.val.location];
        if (!location) return console.warn('[WARNING] Cannot refresh days and' +
            ' times w/out location.');
        var times = this.val.day ? this.utils.getLocationTimeWindowsByDay(
            this.val.day,
            location.hours,
        ) : this.utils.getLocationTimeWindows(location.hours);
        var timeStrings = times.map(t => t.open !== t.close ? t.open + ' to ' +
            t.close : t.open);
        const days = Utils.getLocationDays(location.hours);
        const that = this;

        if (days.length === 1) { // Only one available option (pre-select it)
            this.val.day = days[0];
            times = this.utils.getLocationTimeWindowsByDay(
                this.val.day,
                location.hours,
            );
            timeStrings = times.map(t => t.open + ' to ' + t.close);
        } else if (days.indexOf(this.val.day) < 0) {
            this.val.day = '';
        }
        if (times.length === 1) { // Only one available option (pre-select it)
            this.val.fromTime = times[0].open;
            this.val.toTime = times[0].close;
            this.val.time = timeStrings[0];
        } else if (timeStrings.indexOf(this.val.time) < 0) {
            this.val.fromTime = '';
            this.val.toTime = '';
            this.val.time = '';
        }
        if (times.length < 1 || days.length < 1) return window.app.snackbar
            .view(location.name + ' does not have any open hours.');

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };

        function a(q, action) { // Attaches select and adds listener
            return listen(s(q), action);
        };

        function r(q, el, action, id) { // Replaces select and adds listener
            $(el).find('.mdc-list-item').each(function() {
                MDCRipple.attachTo(this);
            });
            $(that.main).find(q).replaceWith(el);
            that[id] = a(q, action);
        };

        r(
            '#Day',
            that.render.select('Day', that.val.day, days),
            (s) => {
                that.val.day = s.value;
                that.refreshTimes();
            },
            'daySelect',
        );
        r(
            '#Time',
            that.render.select('Time', that.val.time, timeStrings),
            (s) => {
                if (s.value.split(' to ').length > 1) {
                    that.val.fromTime = s.value.split(' to ')[0];
                    that.val.toTime = s.value.split(' to ')[1];
                } else {
                    that.val.fromTime = s.value;
                    that.val.toTime = s.value;
                }
                that.val.time = s.value;
            },
            'timeslotSelect',
        );
    }

    renderSelf() {
        this.main = this.render.template('dialog-form', {
            title: 'Edit Availability'
        });
        $(this.main).find('[data-mdc-dialog-action="ok"]').removeAttr('data-' +
            'mdc-dialog-action');
        const content = this.render.template('input-wrapper');
        const v = this.val;
        const d = this.data;
        const that = this;

        function addS(l, v, d) {
            content.appendChild(that.render.selectItem(l, v, d));
        };

        addS('Location', v.location || '', Utils.concatArr([v.location || ''],
            (window.location.name === 'Any' ? d.locationNames
                .concat(['Custom']) : d.locationNames)));
        addS('Day', v.day || '', Data.days);
        addS('Time', v.time || '', d.timeStrings);

        $(this.main).find('.mdc-dialog__content').append(content);
    }
};

/**
 * Class that represents a dialog much like the 
 * [ConfirmationDialog]{@link module:@tutorbook/dialogs~ConfirmationDialog} but 
 * instead of 'Yes' and 'No' options, it just has one option for 'Ok'. Typically 
 * used to ensure that a user knows about something (i.e. is **notified** about 
 * it) before they can continue using the app.
 * @example
 * const NotificationDialog = require('@tutorbook/dialogs').notify;
 * const dialog = new NotificationDialog('Rejected Clock-In', 'Your clock-in ' +
 *   'request was rejected by Pam Steward. If you think this is a mistake, ' +
 *   'try again or contact Pam at psteward@pausd.org.', () => {});
 * if (clockIn.rejected) dialog.view(); // Notify user if their clock-in request
 * // was rejected.
 */
class NotificationDialog {

    /**
     * Renders the dialog with the given message and title.
     * @param {string} title - The title of the dialog.
     * @param {string} message - The message or main content of the dialog.
     * @param {actionCallback} [action=window.app.nav.back] - Callback for when 
     * the dialog is closed.
     */
    constructor(title, message, action = window.app.nav.back) {
        this.title = title;
        this.message = message;
        this.action = action;
        this.render = window.app.render;
        this.renderSelf();
    }

    /**
     * Renders the `dialog-notification` template with the given title and 
     * message.
     */
    renderSelf() {
        this.el = this.render.template('dialog-notification', {
            title: this.title,
            message: this.message,
        });
    }

    /**
     * Views the notification dialog:
     * 1. Prepends `this.el` to the document's `body`.
     * 2. Sets some basic 
     *    [`MDCDialog`]{@link https://material.io/develop/web/components/dialogs/} 
     *    settings.
     * 2. Opens the dialog.
     */
    view() {
        $('body').prepend(this.el);
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closed', (event) => {
            $(this.el).remove();
            this.action();
        });
        this.dialog.open();
    }
};

/**
 * Class that represents an **essential** item in any web app: the confirmation
 * dialog (that asks users to confirm important or irreversible actions).
 * @example
 * const ConfirmationDialog = require('@tutorbook/dialogs').confirm;
 * const dialog = new ConfirmationDialog('Approve Clock-In?', 'Nicholas ' +
 *   'Chiang clocked in at 3:47 PM for his appointment with Bobby Tarantino ' +
 *   'at 3:45 PM. Approve this clock-in request?', () => this.approve(), true,
 *   () => this.reject());
 * dialog.view(); // Ask the supervisor if they want to reject or approve Nick's
 * // clock-in request (and force them to make a decision by setting 
 * // `forceAction` to `true`).
 * @example
 * const ConfirmationDialog = require('@tutorbook/dialogs').confirm;
 * const title = 'Delete Account?';
 * const summary = 'You are about to permanently delete all of your account ' +
 *   'data (including any appointments, lesson requests, or clocked hours you' +
 *   ' may have). This action cannot be undone. Are you sure you want to ' +
 *   'continue?';
 * const action = () => Data.deleteUser(window.app.user);
 * new ConfirmationDialog(title, summary, action).view();
 */
class ConfirmationDialog {

    /**
     * A callback function that does an (important) action.
     * @callback actionCallback
     */

    /**
     * Renders the dialog with the given message and title.
     * @param {string} title - The title of the dialog. Typically phrased as a 
     * question (e.g. 'Cancel Appointment?').
     * @param {string} message - The main body or content of the dialog.
     * Typically a summary of what the user is about to do.
     * @param {actionCallback} action - The callback to do when the user clicks
     * 'Yes' and confirms that they want to do whatever it is the dialog is
     * asking them about.
     * @param {bool} [forceAction=false] - Whether or not to force the user to 
     * select an action listed in the dialog's action buttons (i.e. if you want 
     * to disable the `Esc` button and scrim click cancel).
     * @param {actionCallback} [noAction=function() {}] - The callback to do 
     * when the user closes the dialog without clicking 'Yes' (e.g. if they 
     * press 'Esc' or tap 'No').
     */
    constructor(title, message, action, forceAction, noAction) {
        this.forceAction = forceAction;
        this.title = title;
        this.message = message;
        this.action = action || window.app.nav.back;
        this.noAction = noAction || function() {};
        this.render = window.app.render;
        this.renderSelf();
    }

    renderSelf() {
        this.el = this.render.template('dialog-confirmation', {
            title: this.title,
            summary: this.message,
        });
    }

    view() {
        $('body').prepend(this.el);
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        if (this.forceAction) {
            this.dialog.scrimClickAction = '';
            this.dialog.escapeKeyAction = '';
        }
        this.dialog.listen('MDCDialog:closed', (event) => {
            $(this.el).remove();
            event.detail.action === 'yes' ? this.action() : this.noAction();
        });
        this.dialog.open();
    }
};

/**
 * Class that represents the "View Request" view/dialog within our web app.
 */
class ViewRequestDialog {

    /**
     * Creates and renders the dialog for the given request.
     * @param {Object} request - The request data to view.
     * @param {string} id - The Firestore document ID for the request.
     */
    constructor(request, id) {
        this.request = request;
        this.id = id;
        this.render = window.app.render;
        this.rendering = this.renderSelf();
    }

    /**
     * Renders the "View Request" dialog using the global `window.app.render`
     * object.
     * @see {@link Render}
     * @return {Promise} A `Promise` that resolves once the dialog/view is fully
     * rendered (i.e. when it is ready to be viewed).
     */
    async renderSelf() {
        const that = this;
        const request = this.request;
        const el = this.render.template('dialog-input');
        const otherUser = Utils.getOtherUser(request.fromUser, request.toUser);

        function add(e) {
            el.appendChild(e);
        };

        function addT(l, d) {
            add(that.render.textFieldItem(l, d));
        };

        function addD(label) {
            add(that.render.listDivider(label));
        };

        if (window.app.user.type === 'Supervisor') {
            // NOTE: By default we show the fromUser's availability for 
            // supervisors, and thus this "user" object is the toUser's data.
            addD('To' + (request.toUser.type ? ' ' +
                request.toUser.type.toLowerCase() : ''));
            add(this.render.userHeader(request.toUser));
            addD('From' + (otherUser.type ? ' ' + otherUser.type.toLowerCase() :
                ''));
        }
        add(this.render.userHeader(otherUser));
        addD('At');
        addT('Location', request.location.name);
        addT('Day', request.time.day);
        addT('From', request.time.from);
        addT('To', request.time.to);
        addD('For');
        addT('Subject', request.subject);
        add(this.render.textAreaItem('Message', request.message));

        if (request.payment.type === 'Paid') {
            addD('Payment');
            addT('Amount', '$' + request.payment.amount.toFixed(2));
            addT('Payment method', request.payment.method);
        }

        const header = this.render.header('header-action', {
            title: 'View Request',
            edit: () => new EditRequestDialog(this.request, this.id).view(),
            showEdit: true,
            showApprove: window.app.user.email === this.request.toUser.email,
            approve: async () => {
                window.app.nav.back();
                window.app.snackbar.view('Approving request...');
                const [err, res] = await to(Data.approveRequest(this.request,
                    this.id));
                if (err) return window.app.snackbar.view('Could not approve ' +
                    'request.');
                window.app.snackbar.view('Approved request.');
            },
        });

        this.header = header;
        this.main = el;
    }

    /**
     * Views the dialog and adds manager(s)
     */
    async view() {
        await this.rendering;
        window.app.intercom.view(false);
        window.app.view(this.header, this.main);
        if (!this.managed) this.manage();
    }

    /**
     * Adds click listeners and attaches various 
     * [MDC components]{@link https://material.io/develop/web/} in the "View
     * Request" view/dialog.
     */
    manage() {
        this.managed = true;
        Utils.attachHeader(this.header);
        this.textFields = {};
        this.main.querySelectorAll('.mdc-text-field').forEach((el) => {
            this.textFields[el.id] = new MDCTextField(el);
        });

        ['textarea', 'input'].forEach((input) => $(this.main).find(input)
            .each(function() { // Disable all inputs
                this.setAttribute('disabled', true);
            }));
    }
};

/**
 * Class that represents the "Modified Request" view/dialog within our web app.
 * @extends ViewRequestDialog
 */
class ViewModifiedRequestDialog extends ViewRequestDialog {
    /**
     * Creates and renders a new "Modified Request" view/dialog.
     */
    constructor(request) {
        super(request.for);
        this.modifiedRequest = request;
    }

    /**
     * Replaces the "View Request" top app bar title with "Modified Request".
     */
    async renderSelf() {
        await super.renderSelf();
        $(this.header).find('.mdc-top-app-bar__title').text('Modified Request');
    }
};

/**
 * Class that represents the "Canceled Request" view/dialog within our web app.
 * @extends ViewRequestDialog
 */
class ViewCanceledRequestDialog extends ViewRequestDialog {
    /**
     * Creates and renders the new "Canceled Request" view/dialog (stores the
     * entire canceled request data (i.e. who canceled the request and when) in 
     * `this.canceledRequest` in addition to the default `this.request` field).
     */
    constructor(request) {
        super(request.for);
        this.canceledRequest = request;
    }

    /**
     * Replaces the "View Request" top app bar title with "Canceled Request".
     */
    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Canceled Request',
        });
    }
};

/**
 * Class that represents the "Rejected Request" view/dialog within our web app.
 * @extends ViewRequestDialog
 */
class ViewRejectedRequestDialog extends ViewRequestDialog {
    /**
     * Creates and renders the new "Rejected Request" view/dialog (stores the
     * entire rejected request data (i.e. who rejected it and when) in 
     * `this.rejectedRequest` in addition to the default `this.request` field).
     */
    constructor(request) {
        super(request.for);
        this.rejectedRequest = request;
    }

    /**
     * Replaces the "View Request" top app bar title with "Rejected Request".
     */
    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Rejected Request',
        });
    }
};

/**
 * Class that represents the dialog that enables supervisors to edit their
 * location's open hours.
 * @see {@link module:@tutorbook/dialogs~EditAvailabilityDialog}
 */
class EditHourDialog {
    /**
     * Creates and renders a new edit hours dialog.
     * @param {MDCTextField} textField - The hour text field to get the initial 
     * value from and to populate once the user finishes populating this dialog.
     */
    constructor(textField) {
        this.render = window.app.render;
        this.data = window.app.data;
        this.textField = textField;
        this.val = Utils.parseHourString(textField.value);
        this.renderSelf();
    }

    /**
     * Renders the edit hours dialog.
     */
    renderSelf() {
        this.main = this.render.template('dialog-form', {
            title: 'Edit Hours'
        });
        $(this.main).find('[data-mdc-dialog-action="ok"]').removeAttr('data-' +
            'mdc-dialog-action');

        const content = this.render.template('input-wrapper');
        const add = (el) => $(content).append(el);
        const addS = (l, v, d) => add(this.render.selectItem(l, v, d));
        const addT = (l, p, v = '') => {
            add(this.render.textFieldWithErrItem(l, v));
            $(content).find('#' + l + ' input').attr('placeholder', p);
        }

        addS('Day', this.val.day || '', Data.days);
        addT('Open', '3:45 PM', this.val.open);
        addT('Close', '4:45 PM', this.val.close);

        $(this.main).find('.mdc-dialog__content').append(content);
    }

    /**
     * Appends the dialog element to the `body` element and opens the dialog.
     */
    view() {
        $('body').prepend(this.main);
        window.editHoursDialog = this;
        this.dialog = MDCDialog.attachTo(this.main);
        this.dialog.open();
        if (!this.managed) this.manage();
    }

    /**
     * Attaches the MDC components and click listeners.
     */
    manage() {
        const t = (q, a) => {
            const t = new MDCTextField($(this.main).find(q)[0]);
            t.useNativeValidation = false;
            $(this.main).find(q + ' input')[0].addEventListener('focusout',
                () => a(t));
            return t;
        };
        const s = (q, a = () => {}) => {
            const s = Utils.attachSelect($(this.main).find(q)[0]);
            s.listen('MDCSelect:change', () => a(s));
            return s;
        };

        this.managed = true;
        this.daySelect = s('#Day', s => this.updateDay(s));
        this.openTextField = t('#Open', t => this.updateOpenTime(t));
        this.closeTextField = t('#Close', t => this.updateCloseTime(t));

        $(this.main).find('#ok-button')[0].addEventListener('click', () => {
            if (this.valid) this.dialog.close('ok');
        });
        this.dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'ok') this.textField.value =
                Utils.getHourString(this.val);
            $(this.main).remove();
        });
    }

    /**
     * Styles a given text field as invalid and shows the given error message in 
     * the text field's helper line.
     * @param {MDCTextField} t - The text field to change to invalid.
     * @param {string} msg - The error message to show in the text field's 
     * helper line.
     * @todo Show error message styling when called from 
     * {@link EditHourDialog#valid}.
     */
    err(t, msg) { // TODO: Show err msg styling when called from get valid().
        t.valid = false;
        t.helperTextContent = msg;
        $(t.root_).parent()
            .find('.mdc-text-field-helper-line').show().end()
            .parent().addClass('err-input-list-item--errored');
        return false;
    }

    validate(t) {
        t.valid = true;
        $(t.root_).parent()
            .find('.mdc-text-field-helper-line').hide().end()
            .parent().removeClass('err-input-list-item--errored');
        return t.value;
    }

    get valid() { // We can't use && if we want to validate every input.
        var valid = true;
        valid = this.updateOpenTime() && valid;
        valid = this.updateCloseTime() && valid;
        valid = this.updateDay() && valid;
        return valid;
    }

    updateOpenTime(t = this.openTextField, update = true) {
        const periods = this.data.periods[this.val.day] || [];
        const periodsInd = periods.indexOf(t.value);
        const ind = this.data.timeStrings.indexOf(t.value);
        if (ind < 0 && periodsInd > periods.indexOf(this.val.close)) return this
            .err(t, 'Opening period can\'t be after closing period.');
        if (!periods.length || periodsInd < 0) {
            if (ind < 0) return this.err(t, 'Time is formatted incorrectly or' +
                ' isn\'t on ' + this.val.day + '\'s bell schedule.');
            if (ind > this.data.timeStrings.indexOf(this.val.close)) return this
                .err(t, 'Opening time can\'t be after closing time.');
        }
        this.val.open = this.validate(t);
        if (update) this.updateCloseTime(this.closeTextField, false);
        return true;
    }

    updateCloseTime(t = this.closeTextField, update = true) {
        const periods = this.data.periods[this.val.day] || [];
        const periodsInd = periods.indexOf(t.value);
        const ind = this.data.timeStrings.indexOf(t.value);
        if (ind < 0 && periodsInd < periods.indexOf(this.val.open)) return this
            .err(t, 'Closing period can\'t be before opening period.');
        if (!periods.length || periodsInd < 0) {
            if (ind < 0) return this.err(t, 'Time is formatted incorrectly or' +
                ' isn\'t on ' + this.val.day + '\'s bell schedule.');
            if (ind < this.data.timeStrings.indexOf(this.val.open)) return this
                .err(t, 'Closing time can\'t ' + 'be before opening time.');
        }
        this.val.close = this.validate(t);
        if (update) this.updateOpenTime(this.openTextField, false);
        return true;
    }

    updateDay(s = this.daySelect) {
        if (Data.days.indexOf(s.value) < 0) return s.valid = false;
        this.val.day = s.value;
        if (this.openTextField.value)
            this.updateOpenTime(this.openTextField, false);
        if (this.closeTextField.value)
            this.updateCloseTime(this.closeTextField, false);
        return true;
    }
};

/**
 * Class that represents the "Edit Location" dialog/view that enables tutoring
 * supervisors to:
 * - Edit when their location is open
 * - Configure service hour rounding for past appointments clocked at their 
 *   location
 * - Change their location's description (name cannot be changed... yet)
 * - Add and remove supervisors for their location
 * @todo Enable supervisors to change their location's name.
 * @todo Refresh changes live and distribute them across the app (i.e. remove
 * the need to reload the app after making changes to locations or website
 * configurations).
 * @todo Change the supervisor inputs into 
 * [user search text fields]{@linkplain Render#searchTextFieldItem}.
 */
class EditLocationDialog {
    /**
     * Creates and renders a new "Edit Location" dialog.
     * @param {Location} location - The location data to edit.
     * @param {string} id - The ID of the location's Firestore document (that we
     * update when the user hits the checkmark top app bar icon button).
     */
    constructor(location, id) {
        Utils.sync(Data.emptyLocation, this);
        Utils.sync(Utils.filterLocationData(location), this);
        this.id = id;
        this.location = Utils.filterLocationData(location);
        this.render = window.app.render;
        this.renderSelf();
    }

    /**
     * Renders the "Edit Location" dialog by adding:
     * 1. A "Basic info" list divider
     * 2. A "Name" text field
     * 3. A "Description" text area
     * 4. A "Service hour rules" list divider
     * 5. A "Round service hours" select
     * 6. A "To the nearest" select
     * 7. A "Round times to the nearest" select
     * 8. An "Open hours" list divider
     * 9. A bunch of "Hour" inputs (text fields that open up 
     * [EditHourDialog]{@link module:@tutorbook/dialogs~EditHourDialog}s).
     * 10. A "Delete Location" button
     * to the dialog's `this.main` `HTMLElement`.
     * @todo Add supervisor search text field input items to designate who is 
     * able to approve/reject clock-in/out requests.
     */
    renderSelf() {
        this.header = this.render.header('header-action', {
            ok: () => this.save(),
            cancel: () => {
                if (this.changed) return new ConfirmationDialog('Discard ' +
                    'Changes?', 'Are you sure that you want to discard your ' +
                    'changes to the ' + this.name + '? Save your changes by ' +
                    'clicking \'No\' or anywhere outside of this dialog.',
                    () => this.reset(), false, () => this.save()).view();
                window.app.nav.back();
            },
            title: 'Edit Location',
        });
        this.main = this.render.template('dialog-input');

        const add = (e) => this.main.appendChild(e);
        const addD = (label) => add(this.render.listDivider(label));
        const addActionD = (l, a) => add(this.render.actionDivider(l, a));
        const addS = (l, v = '', d = []) => add(this.render.selectItem(l, v,
            Utils.concatArr(d, [v])));
        const addT = (l, v = '') => add(this.render.textFieldItem(l, v));

        addD('Basic info');
        addT('Name', this.name);
        add(this.render.textAreaItem('Description', this.description));
        addD('Service hour rules');
        addS('Round service hours', this.config.hrs.rounding, Data.roundings);
        addS('To the nearest', this.config.hrs.threshold, Data.thresholds);
        addS('Round times to the nearest', this.config.hrs.timeThreshold, Data
            .timeThresholds);
        addActionD('Open hours', {
            add: () => this.addHourInput(),
            remove: () => this.removeHourInput(),
        });
        this.addHourInputs();
        /*TODO: Add supervisor user search inputs.
         *addActionD('Supervisors', {
         *    add: () => this.addSupervisorInput(),
         *    remove: () => this.removeSupervisorInput(),
         *});
         *this.addSupervisorInputs();
         */
        add(this.render.template('delete-user-input', {
            label: 'Delete Location',
            delete: () => new ConfirmationDialog('Delete Location?', 'You are' +
                ' about to permanently delete all ' + this.name + ' data. ' +
                'This action cannot be undone. Please ensure to check with ' +
                'your fellow supervisors before continuing.', async () => {
                    window.app.nav.back();
                    window.app.snackbar.view('Deleting location...');
                    const [err, res] = await to(Data
                        .deleteLocation(this.id));
                    if (err) return window.app.snackbar.view('Could ' +
                        'not delete location.');
                    window.app.snackbar.view('Deleted location.');
                }).view(),
        }));
    }

    /**
     * Views (and subsequently manages) the "Edit Location" dialog and our
     * Intercom Messenger.
     * @see {@link module:@tutorbook/app~Tutorbook#view}
     * @see {@link Help#view}
     */
    view() {
        window.app.intercom.view(true);
        window.app.view(this.header, this.main);
        if (!this.managed) this.manage();
    }

    /**
     * Attaches MDC Components and click listeners.
     */
    manage() {
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('.mdc-icon-button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        });
        $(this.main).find('.mdc-button').each(function() {
            MDCRipple.attachTo(this);
        });
        const hourInputs = this.hourInputs = [];
        const t = (q) => new MDCTextField($(this.main).find(q)[0]);
        const s = (q, a = () => {}) => {
            const s = Utils.attachSelect($(this.main).find(q)[0]);
            s.listen('MDCSelect:change', () => a(s));
            return s;
        };
        const ts = (q) => {
            const res = [];
            $(this.main).find(q).each(function() {
                res.push(new MDCTextField(this));
            });
            return res;
        };
        this.nameTextField = t('#Name');
        $(this.main).find('#Name input').attr('disabled', 'disabled');
        this.descriptionTextArea = t('#Description');
        this.roundingSelect = s('[id="Round service hours"]', s => {
            if (Data.roundings.indexOf(s.value) < 0) return s.valid = false;
            this.config.hrs.rounding = s.value;
        });
        this.thresholdSelect = s('[id="To the nearest"]', s => {
            if (Data.thresholds.indexOf(s.value) < 0) return s.valid = false;
            this.config.hrs.threshold = s.value;
        });
        this.timeThresholdSelect = s('[id="Round times to the nearest"]', s => {
            if (Data.timeThresholds.indexOf(s.value) < 0) return s.valid = false;
            this.config.hrs.timeThreshold = s.value;
        });
        this.supervisorTextFields = ts('[id="Supervisor"]');
        $(this.main).find('[id="Open"]').each(function() {
            const textField = new MDCTextField(this);
            hourInputs.push(textField);
            const dialog = new EditHourDialog(textField);
            this.addEventListener('click', () => dialog.view());
        });
    }

    /**
     * Updates the location's data if all inputs are valid.
     * @example
     * const EditLocationDialog = require('@tutorbook/dialogs').editLocation;
     * const dialog = new EditLocationDialog(locationData, locationId);
     * // Change the data in the dialog somehow.
     * await dialog.save();
     * @return {Promise<undefined>} Promise that resolves once the location has
     * been updated (or if we've encountered an error while updating it).
     */
    async save() {
        if (!this.valid) return;
        window.app.nav.back();
        window.app.snackbar.view('Updating location...');
        this.location = Utils.filterLocationData(this);
        const [err, res] = await to(Data.updateLocation(Utils
            .filterLocationData(this), this.id));
        if (err) return window.app.snackbar.view('Could not update location.');
        window.app.snackbar.view('Updated location.');
    }

    /**
     * Resets the inputs on the dialog (used when the user doesn't click on the
     * checkmark but instead just heads back).
     */
    reset() {
        window.app.nav.back();
        Utils.sync(this.location, this);
        this.renderSelf();
        this.managed = false;
    }

    /**
     * Returns `true` if the currently inputted/selected values match our
     * original `this.location` [Location]{@link Location} object.
     * @return {bool} If the user has changed any location data.
     */
    get changed() {
        this.valid; // Update location hours and description
        for (var [key, val] of Object.entries(this.location)) {
            if (typeof val === 'object' ? !Utils.identicalMaps(this[key], val) :
                this[key] !== val) return true;
        }
        return false;
    }

    /**
     * Checks and validates all currently inputted/selected values while:
     * - Updating location hours and description from their values within their
     *   corresponding text fields.
     * - Updating the service hour rounding rules.
     * @example
     * if (this.valid) this.save(); // Save location changes if they're valid.
     * @return {bool} If the currently inputted/selected values are valid.
     */
    get valid() { // Updates location hours and description
        const strings = [];
        const invalid = s => {
            s.required = true;
            return s.valid = false;
        };
        $(this.main).find('[id="Open"] input').each(function() {
            if ($(this).val()) strings.push($(this).val());
        });
        this.hours = Utils.parseHourStrings(strings);
        this.description = this.descriptionTextArea.value;
        if (Data.thresholds.indexOf(this.thresholdSelect.value) < 0)
            return invalid(this.thresholdSelect);
        if (Data.roundings.indexOf(this.roundingSelect.value) < 0)
            return invalid(this.roundingSelect);
        if (Data.timeThresholds.indexOf(this.timeThresholdSelect.value) < 0)
            return invalid(this.timeThresholdSelect);
        this.config.hrs.threshold = this.thresholdSelect.value;
        this.config.hrs.rounding = this.roundingSelect.value;
        this.config.hrs.timeThreshold = this.timeThresholdSelect.value;
        return true;
    }

    /**
     * Adds (and manages) an "Hour" input to the dialog.
     */
    addHourInput() {
        const el = this.render.textFieldItem('Open', '');
        const textField = new MDCTextField(el);
        const dialog = new EditHourDialog(textField);
        el.addEventListener('click', () => dialog.view());
        this.hourInputs.push(textField);
        $(el).insertAfter($(this.main).find('[id="Open"]').last().parent());
        dialog.view();
    }

    /**
     * Removes an "Hour" input and it's corresponding open hours timeslot.
     */
    removeHourInput() {
        this.hourInputs.pop();
        $(this.main).find('[id="Open"]').last().parent().remove();
    }

    addHourInputs() {
        const add = (t = '') => $(this.main).append(this.render.textFieldItem(
            'Open', t));
        Utils.getHourStrings(this.hours).forEach(timeslot => {
            add(timeslot);
        });
        add(); // Add empty input
    }

    addSupervisorInput() {
        const elA = this.render.textField('Supervisor', '');
        const elB = this.render.textField('Supervisor', '');
        const el = this.render.splitListItem(elA, elB);
        this.supervisorTextFields.push(new MDCTextField(elA));
        this.supervisorTextFields.push(new MDCTextField(elB));
        $(el).insertAfter($(this.main).find('[id="Supervisor"]').last()
            .parent());
    }

    removeSupervisorInput() {
        this.supervisorTextFields.pop();
        this.supervisorTextFields.pop();
        $(this.main).find('[id="Supervisor"]').last().parent().remove();
    }

    addSupervisorInputs() {
        const add = (e, el) => $(this.main).append(this.render
            .splitListItem(e, el));
        const t = (v = '') => this.render.textField('Supervisor', v);
        for (var i = 0; i < this.supervisors.length; i += 2) {
            var supA = this.supervisors[i];
            var supB = this.supervisors[i + 1];
            add(t(subA), t(subB));
        }
        add(t(), t()); // Add empty inputs
    }
};

/**
 * Class that represents the "New Location" dialog/view that enables tutoring
 * supervisors to create new locations that students can tutor at (and be safely
 * supervised) at.
 * @extends EditLocationDialog
 * @todo Implement this class, add a "New Location" FAB in the supervisor's 
 * ["Configuration" view]{@link https://tutorbook.app/app/config}, and roll the 
 * features out to production.
 */
class NewLocationDialog extends EditLocationDialog {
    /**
     * Creates and renders the "New Location" dialog/view.
     * @todo Define what an empty location looks like and pass it into the
     * [parent]{@link module:@tutorbook/dialogs~EditLocationDialog}'s constructor.
     */
    constructor() {
        const location = {};
        super(location, Utils.genID());
    }

    renderSelf() {
        super.renderSelf();
        this.header = this.render.header('header-action', {
            ok: () => console.log('[TODO] Create new location.'),
            title: 'New Location',
        });
    }
};

/**
 * Class that represents an "Edit Request" dialog that enables users to edit
 * their inbound and/or outbound lesson requests.
 */
class EditRequestDialog {
    /**
     * Creates and renders the "Edit Request" dialog for the given request.
     * @param {Object} request - The request data to edit in this dialog.
     * @param {string} id - The Firestore document ID that the request data
     * came from (i.e. the ID of the Firestore document to edit).
     */
    constructor(request, id) {
        this.request = request;
        this.id = id;
        this.render = window.app.render;
        this.utils = window.app.utils;
        this.req = []; // Required fields
        this.rendering = this.renderSelf();
    }

    /**
     * The other user in a request or appointment (i.e. the user that does not
     * share a uID with our current app user).
     * @typedef {Profile} OtherUser
     * @global
     * @see {@link Utils#getOtherUser}
     */

    /**
     * Renders the "Edit Request" dialog/view.
     * @param {Object} [profile=OtherUser] - Specify a profile to show the user
     * header of (typically just the [other user]{@link OtherUser} in the 
     * request).
     * @return {Promise<undefined>} Promise that resolves once the dialog
     * is fully rendered (i.e. when it is ready to be viewed).
     */
    async renderSelf(profile) {
        const request = this.request;
        const utils = this.utils;
        const that = this;
        const el = this.render.template('dialog-input');
        const user = profile || await Data.getUser(
            Utils.getOtherUser(request.fromUser, request.toUser).uid
        );
        // First, parse the user's availability map into location, day, and 
        // time arrays
        const locations = Utils.getUserAvailableLocations(user.availability);
        const days = (request.location && request.location.name) ?
            Utils.getUserAvailableDaysForLocation(
                user.availability,
                request.location.name
            ) : Utils.getUserAvailableDays(user.availability);
        const timeslots = (request.time.day && request.location.name) ?
            utils.getUserAvailableTimeslotsForDay(
                user.availability,
                request.time.day,
                request.location.name,
            ) : utils.getUserAvailableTimeslots(user.availability);
        const timeslot = request.time.from === request.time.to ? request.time
            .from || '' : request.time.from + ' to ' + request.time.to;

        // If there are only no options, make sure to tell the user so they don't
        // think that it's a bug (that the only select options are the ones that
        // were already selected).
        if (locations.length < 1 && days.length < 1 && timeslots.length < 1) {
            window.app.snackbar
                .view(user.name + ' does not have any other availability.');
        }

        function add(e) {
            el.appendChild(e);
        };

        function addS(l, v, d) {
            add(that.render.selectItem(l, v, Utils.concatArr([v], d)));
        };

        function addD(l) {
            add(that.render.listDivider(l));
        };

        function addH(profile) {
            add(that.render.userHeader(profile));
        };

        if (window.app.user.type === 'Supervisor') {
            // NOTE: By default we show the fromUser's availability for 
            // supervisors, and thus this "user" object is the fromUser's data.
            const toUser = await Data.getUser(request.toUser.uid);
            addD('To ' + toUser.type.toLowerCase());
            addH(toUser);
            addD('From ' + user.type.toLowerCase());
        }
        addH(user);
        addD('At');
        addS('Location', request.location.name, locations.concat(['Custom']));
        addS('Day', request.time.day, days);
        addS('Time', timeslot, timeslots);
        addD('For');
        addS('Subject', request.subject, user.subjects);
        add(this.render.textAreaItem('Message', request.message));

        const header = this.render.header('header-action', {
            title: 'Edit Request',
            ok: () => {},
        });

        this.header = header;
        this.main = el;
        this.user = user;
    }

    // TODO: What are the MDC guidelines for styling inputs as invalid? Should
    // we only style when the user tries to submit the form? Or as the user is
    // filling out the form?
    get valid() {
        var valid = true;
        this.req.forEach((req) => {
            if (!req.valid()) return valid = req.input.valid = false;
            req.input.valid = true;
        });
        return valid;
    }

    // Views the dialog and adds manager(s)
    async view() {
        if (!this.main) await this.rendering;
        window.requestDialog = this;
        window.app.intercom.view(false);
        window.app.view(this.header, this.main);
        if (!this.managed) this.manage();
    }

    async modifyRequest() {
        window.app.nav.back();
        const [err, res] = await to(Data.modifyRequest(this.request, this.id));
        if (err) return window.app.snackbar.view('Could not modify request.');
        window.app.snackbar.view('Modified request.');
    }

    sendRequest() {} // Added in NewRequestDialog

    updateAmount() {} // Added in PaidRequestDialog

    manage() {
        this.managed = true;
        const availability = this.user.availability;
        const request = this.request;
        const dialog = this.main;
        const that = this;

        // AT
        const locationEl = dialog.querySelector('#Location');
        const locationSelect = Utils.attachSelect(locationEl);
        locationSelect.listen('MDCSelect:change', function() {
            if (locationSelect.value === 'Custom') {
                $(dialog).find('#Location').replaceWith(
                    that.render.locationInput((val) => {
                        request.location.name = val.formatted_address;
                        request.location.id = val.place_id;
                    }));
            } else {
                request.location.name = locationSelect.value;
                request.location.id = window.app.data // Only init data once
                    .locationsByName[locationSelect.value];
                that.refreshDayAndTimeSelects(request, availability);
            }
        });

        const dayEl = dialog.querySelector('#Day');
        const daySelect = Utils.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            request.time.day = daySelect.value;
            that.refreshTimeSelects(request, availability);
        });

        const timeslotEl = dialog.querySelector('#Time');
        const timeslotSelect = Utils.attachSelect(timeslotEl);
        timeslotSelect.listen('MDCSelect:change', () => {
            if (timeslotSelect.value.indexOf(' to ') > 0) {
                request.time.from = timeslotSelect.value.split(' to ')[0];
                request.time.to = timeslotSelect.value.split(' to ')[1];
            } else {
                request.time.from = timeslotSelect.value;
                request.time.to = timeslotSelect.value;
            }
            if (that.valid) that.updateAmount();
            if (that.updateClockingTimes) that.updateClockingTimes();
        });

        // FOR
        const subjectEl = dialog.querySelector('#Subject');
        const subjectSelect = Utils.attachSelect(subjectEl);
        subjectSelect.listen('MDCSelect:change', function() {
            request.subject = subjectSelect.value;
        });

        const messageEl = dialog.querySelector('#Message');
        const messageTextField = MDCTextField.attachTo(messageEl);

        [locationSelect, daySelect, timeslotSelect, subjectSelect].forEach(
            (input) => this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => input.value !== '',
            }));

        // Only update or send request when the check button is clicked
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('#ok')[0].addEventListener('click', () => {
            request.message = messageTextField.value;
            if (that.valid) that.modifyRequest();
        });
        $(this.header).find('#send')[0].addEventListener('click', () => {
            request.message = messageTextField.value;
            if (that.valid) that.sendRequest();
        });
    }

    refreshDayAndTimeSelects(request, a) {
        if (!a[request.location.name]) return; // Custom location
        const that = this;
        const days = Utils.getUserAvailableDaysForLocation(a, request.location
            .name);
        if (days.length === 1) request.time.day = days[0];
        const timeslots = (request.time.day && request.location.name) ?
            this.utils.getUserAvailableTimeslotsForDay(
                a,
                request.time.day,
                request.location.name,
            ) : this.utils.getUserAvailableTimeslots(a);
        if (timeslots.length === 1 && timeslots[0].indexOf(' to ') > 0) {
            request.time.from = timeslots[0].split(' to ')[0];
            request.time.to = timeslots[0].split(' to ')[1];
            if (this.updateClockingTimes) this.updateClockingTimes();
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
            if (this.updateClockingTimes) this.updateClockingTimes();
        }

        // If there are only no options, make sure to tell the user so they don't
        // think this it's a bug (this the only select options are the ones this
        // were already selected).
        if (days.length < 1 && timeslots.length < 1) return window.app.snackbar
            .view(request.toUser.name + ' does not have any availability at ' +
                'the ' + request.location.name + '.');

        const timeslot = request.time.from === request.time.to ? request.time
            .from || '' : request.time.from + ' to ' + request.time.to;
        const timeslotEl = this.render.select('Time', timeslot, timeslots)
        const oldTimeslotEl = document.querySelector('main .dialog-input')
            .querySelector('#Time');
        oldTimeslotEl.parentNode.insertBefore(timeslotEl, oldTimeslotEl);
        oldTimeslotEl.parentNode.removeChild(oldTimeslotEl);
        const timeslotSelect = Utils.attachSelect(timeslotEl);
        timeslotSelect.listen('MDCSelect:change', function() {
            if (timeslotSelect.value.indexOf(' to ') > 0) {
                request.time.from = timeslotSelect.value.split(' to ')[0];
                request.time.to = timeslotSelect.value.split(' to ')[1];
            } else {
                request.time.from = timeslotSelect.value;
                request.time.to = timeslotSelect.value;
            }
            if (that.valid) that.updateAmount();
            if (that.updateClockingTimes) that.updateClockingTimes();
        });

        const dayEl = this.render.select('Day', request.time.day || '', days);
        const oldDayEl = document.querySelector('main .dialog-input')
            .querySelector('#Day');
        oldDayEl.parentNode.insertBefore(dayEl, oldDayEl);
        oldDayEl.parentNode.removeChild(oldDayEl);
        const daySelect = Utils.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', function() {
            request.time.day = daySelect.value;
            that.refreshTimeSelects(request, a);
        });

        this.req = this.req.filter(r => ['Day', 'Time'].indexOf(r.id) < 0);
        [daySelect, timeslotSelect].forEach((input) => {
            this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => input.value !== '',
            });
        });
        if (this.valid) this.updateAmount(); // Update valid input styling 
    }

    refreshTimeSelects(request, a) {
        if (!a[request.location.name]) return; // Custom location
        const that = this;
        const timeslots = this.utils.getUserAvailableTimeslotsForDay(
            a,
            request.time.day,
            request.location.name
        );

        if (timeslots.length === 1 && timeslots[0].indexOf(' to ') > 0) {
            request.time.from = timeslots[0].split(' to ')[0];
            request.time.to = timeslots[0].split(' to ')[1];
            if (this.updateClockingTimes) this.updateClockingTimes();
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
            if (this.updateClockingTimes) this.updateClockingTimes();
        }

        // If there are only no options, make sure to tell the user so they don't
        // think this it's a bug (this the only select options are the ones this
        // were already selected).
        if (timeslots.length < 1) return window.app.snackbar.view(request.toUser
            .name + ' does not have any availability on ' + request.day + 's.');

        const timeslot = request.time.from === request.time.to ? request.time
            .from || '' : request.time.from + ' to ' + request.time.to;
        const timeslotEl = this.render.select('Time', timeslot, timeslots)
        const oldTimeslotEl = document.querySelector('main .dialog-input')
            .querySelector('#Time');
        oldTimeslotEl.parentNode.insertBefore(timeslotEl, oldTimeslotEl);
        oldTimeslotEl.parentNode.removeChild(oldTimeslotEl);
        const timeslotSelect = Utils.attachSelect(timeslotEl);
        timeslotSelect.listen('MDCSelect:change', function() {
            if (timeslotSelect.value.indexOf(' to ') > 0) {
                request.time.from = timeslotSelect.value.split(' to ')[0];
                request.time.to = timeslotSelect.value.split(' to ')[1];
            } else {
                request.time.from = timeslotSelect.value;
                request.time.to = timeslotSelect.value;
            }
            if (that.valid) that.updateAmount();
            if (that.updateClockingTimes) that.updateClockingTimes();
        });
        this.req = this.req.filter(r => r.id !== 'Time');
        this.req.push({
            input: timeslotSelect,
            id: 'Time',
            valid: () => timeslotSelect.value !== '',
        });
        if (this.valid) this.updateAmount(); // Update valid input styling 
    }
};


class NewRequestDialog extends EditRequestDialog {

    // Creates editRequestDialog based on the given subject and toUser
    constructor(subject, user) {
        const utils = window.app.utils || new Utils();
        const request = {
            'subject': subject,
            'fromUser': window.app.conciseUser,
            'toUser': Utils.filterRequestUserData(user),
            'timestamp': new Date(),
            'location': {
                name: '',
                id: '',
            },
            'message': '',
            'time': {
                day: '',
                from: '',
                to: '',
            },
            'payment': {
                type: user.payments.type || 'Free',
                method: 'PayPal',
                amount: 0,
            },
        };
        // Check to see if we can pre-select for the user
        const locations = Utils.getUserAvailableLocations(user.availability);
        const days = Utils.getUserAvailableDays(user.availability);
        const timeslots = utils.getUserAvailableTimeslots(user.availability);
        if (locations.length === 1) {
            request.location.name = locations[0];
            request.location.id =
                window.app.data.locationsByName[request.location.name];
        }
        if (timeslots.length === 1 && timeslots[0].indexOf(' to ') > 0) {
            request.time.from = timeslots[0].split(' to ')[0];
            request.time.to = timeslots[0].split(' to ')[1];
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
        }
        if (days.length === 1) {
            request.time.day = days[0];
        }

        // No options for the user to select
        if (locations.length < 1 && days.length < 1 && timeslots.length < 1)
            return window.app.snackbar.view(user.name + ' does not have any ' +
                'availability.');

        super(request, Utils.genID());
        this.user = user; // Cannot reference `this` until after super();
    }

    async renderSelf() {
        await super.renderSelf(this.user);
        this.header = this.render.header('header-action', { // Override header
            title: 'New Request',
            send: () => {},
        });
    }

    async sendRequest() { // Override modify to create a new request
        window.app.nav.back();
        window.app.snackbar.view('Sending request...');
        const [err, res] = await to(Data.newRequest(this.request, this.payment));
        if (err) return window.app.snackbar.view('Could not send request.');
        window.app.snackbar.view(
            'Sent ' + this.request.toUser.name + ' request.',
            'Undo',
            async () => {
                window.app.snackbar.view('Canceling request...');
                const [err, response] = await to(
                    Data.cancelRequest(this.request, res.id));
                if (err) return window.app.snackbar.view('Could not cancel ' +
                    'request. Go to your dashboard to try again.');
                window.app.snackbar.view('Canceled request to ' +
                    this.request.toUser.email + '.');
            },
        );
    }
};


class PaidRequestDialog extends NewRequestDialog {

    constructor(subject, user) {
        super(subject, user);
        if (user.payments.type !== 'Paid') {
            console.warn('[WARNING] PaidRequestDialog was passed a user that ' +
                'isn\'t supposed to be paid.');
        }
        this.request.payment.type = 'Paid';
        this.payment = {
            to: this.request.toUser,
            from: this.request.fromUser,
            amount: this.getAmount(),
            timestamp: new Date(),
            for: this.request,
            id: this.id || '',
            method: 'PayPal',
        };
    }

    sendRequest() {
        if (!this.payment.transaction) return window.app.snackbar.view(
            'Please add a valid payment method.');
        return super.sendRequest();
    }

    async renderSelf() {
        await super.renderSelf();
        this.renderPayments();
        this.updateAmount();
    }

    renderPayments() {
        $(this.main).append(this.render.listDivider('Payment'));
        $(this.main).append(this.render.textFieldItem('Amount', '$0.00'));
        $(this.main).append(this.render.paypalButtonsItem());
    }

    getAmount() {
        // Get the duration between the the from and to times
        const hours = window.app.utils.getHoursFromStrings(
            this.request.time.from,
            this.request.time.to
        );
        // And multiply it by the hourly charge
        return this.request.toUser.hourlyCharge * hours;
    }

    updateAmount() {
        this.payment.amount = this.getAmount();
        this.request.payment.amount = this.getAmount();
        $(this.main).find('#Amount input')
            .attr('value', '$' + this.payment.amount.toFixed(2));
    }

    manage() {
        super.manage();
        this.managePayments();
    }

    managePayments() {
        const that = this;
        const amountEl = $(this.main).find('#Amount')[0];
        const amountTextField = MDCTextField.attachTo(amountEl);
        $(amountEl).find('input').attr('disabled', 'disabled');

        if (!window.app.onMobile) {
            const descriptionEl = $(this.main)
                .find('[id="Authorize payment"]')[0];
            const descriptionTextArea = MDCTextField.attachTo(descriptionEl);
            $(descriptionEl).find('textarea').attr('disabled', 'disabled');
        }

        paypal.Buttons({
            createOrder: (data, actions) => {
                // Set up the transaction
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            // TODO: Right now, we're only going to authorize for
                            // one, one hour lesson and then show another prompt once
                            // the tutor clocksOut asking if they want another.
                            value: that.payment.amount
                        }
                    }]
                }).catch((err) => {
                    console.error('[ERROR] While creating PayPal order:', err);
                    window.app.snackbar.view('Could not add payment. Please ' +
                        'ensure that you\'ve selected a valid time range.');
                });
            },
            onApprove: (data, actions) => {
                return actions.order.authorize().then((auth) => {
                    // NOTE: All we need to be able to capture this auth later
                    // is this id. Also note that this auth period is only 29
                    // days.
                    var authID = auth.purchase_units[0].payments.authorizations[0].id;
                    that.payment.transaction = auth;
                    that.payment.authID = authID;
                    window.app.snackbar.view('Added payment method.')
                    // Call your server to save the transaction
                    // We'll use Firestore here to process the transaction
                    // by adding a payment document in this user's
                    // subcollections.
                });
            },
        }).render('#paypal-buttons');
    }
};


class StripeRequestDialog extends PaidRequestDialog {

    constructor(subject, user) {
        super(subject, user);
        this.request.payment.method = 'Stripe';
        this.payment = {
            to: this.request.toUser,
            from: this.request.fromUser,
            amount: this.getAmount(),
            for: this.request,
            timestamp: new Date(),
            method: 'Stripe',
        };
        this.stripe = Stripe(window.app.test ?
            'pk_test_EhDaWOgtLwDUCGauIkrELrOu00J8OIBNuf' :
            'pk_live_rospM71ihUDYWBArO9JKmanT00L5dZ36vA');
    }

    async sendRequest() {
        const res = await this.stripe.createToken(this.card);
        if (res.error) return $(this.main).find('#Method')[0].scrollIntoView({
            behavior: 'smooth'
        });
        this.payment.transaction = res.token;
        return super.sendRequest();
    }

    renderPayments() {
        $(this.main).append(this.render.listDivider('Payment'));
        $(this.main).append(this.render.textFieldItem('Amount', '$0.00'));
        $(this.main).append(this.render.template('stripe-card-input'));
        // TODO: Show the tutor's payment policy here?
    }

    managePayments() {
        const amountEl = $(this.main).find('#Amount')[0];
        const amountTextField = MDCTextField.attachTo(amountEl);
        $(amountEl).find('input').attr('disabled', 'disabled');

        const methodEl = $(this.main).find('#Method')[0];
        const err = $(methodEl).find('#err').hide();
        const msg = $(methodEl).find('#msg');

        function showErr(error) {
            msg.hide();
            err.text(error.message).show();
            $(methodEl).find('.mdc-text-field')
                .addClass('mdc-text-field--invalid');
            $(methodEl).find('.mdc-floating-label')
                .addClass('mdc-floating-label--shake');
        };

        function hideErr() {
            err.hide();
            msg.show();
            $(methodEl).find('.mdc-text-field')
                .removeClass('mdc-text-field--invalid');
            $(methodEl).find('.mdc-floating-label')
                .removeClass('mdc-floating-label--shake');
        };

        const elements = this.stripe.elements();
        const style = {
            base: { // Comes from MDCTextField styling
                fontSize: '16px',
                fontFamily: '"Roboto", sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': {
                    color: '#676767',
                },
                letterSpacing: '0.00937em',
            },
            invalid: {
                color: '#B00020',
                iconColor: '#B00020',
            },
        };
        this.card = elements.create('card', {
            style
        });
        this.card.mount($(this.main).find('#card-input')[0]);
        this.card.addEventListener('change', (event) => {
            if (event.error) {
                showErr(event.error);
            } else {
                hideErr();
            }
        });
    }
};


/**
 * Class that represents the "View Appointment" view/dialog in our web app.
 * @extends ViewRequestDialog
 */
class ViewApptDialog extends ViewRequestDialog {
    /**
     * Creates and renders a new "View Appointment" dialog (building off of what
     * has already been initialized and rendered in the "View Request" dialog).
     * @see {@link module:@tutorbook/dialogs~ViewRequestDialog}
     */
    constructor(appt, id) {
        super(appt.for, id);
        this.appt = appt;
    }

    /**
     * Modifies the already rendered "View Request" dialog to:
     * 1. Add any necessary FABs (e.g. a "Request Payment" button for paid 
     *    tutors or a "Clock-In" button for service hour tutors).
     * 2. Add an "Hours clocked" section for service hours tutors.
     * 3. Combine the "From pupil" and "To tutor" list divider headers into one 
     *    "Attendees" header for supervisors
     */
    async renderSelf() {
        await super.renderSelf();
        if (['Tutor', 'Supervisor'].indexOf(window.app.user.type) >= 0) {
            if (this.request.payment.type === 'Paid') {
                $(this.main).append(this.render.fab('requestPayment'));
            } else {
                $(this.render.listDivider('Hours clocked')).insertAfter(
                    $(this.main).find('.user-header').last()
                );
                $(this.render.splitListItem(
                    this.render.textField('Current', '0:0:0.00'),
                    this.render.textField('Total', '0:0:0.00')
                )).insertAfter($(this.main).find('[id="Hours clocked"]'));
                $(this.main).append(this.render.fab('clockIn'));
            }
        }
        if (window.app.user.type === 'Supervisor') {
            $(this.main).find('[id="From' + (this.request.fromUser.type ? ' ' +
                this.request.fromUser.type.toLowerCase() : '') + '"]').remove();
            $(this.main).find('[id="To' + (this.request.toUser.type ? ' ' +
                this.request.toUser.type.toLowerCase() : '') + '"] h4').text(
                'Attendees');
        } else if (window.app.user.type === 'Tutor') {
            $(this.main).find('#clocking').addClass('second-fab');
            $(this.main).append(this.render.fab('requestTime'));
        }
        this.header = this.render.header('header-action', {
            showEdit: true,
            edit: () => new EditApptDialog(this.appt, this.id).view(),
            title: 'Upcoming Appointment',
        });
    }

    /**
     * Adds click listeners (i.e. on the FAB button(s)) and attaches the
     * necessary MDC components.
     */
    manage() {
        super.manage();
        $(this.main).find('.mdc-fab').each(function() {
            MDCRipple.attachTo(this);
        });
        const listen = (b, a) => b ? b.addEventListener('click', a) : null;
        const paymentBtn = $(this.main).find('#request-payment')[0];
        const clockInBtn = $(this.main).find('#clocking')[0];
        const timeBtn = $(this.main).find('#request-time')[0];
        listen(paymentBtn, async () => {
            window.app.snackbar.view('Sending payment request...');
            const [err, res] = await to(
                Data.requestPaymentFor(this.appt, this.id)
            );
            if (err) return window.app.snackbar.view('Could not send ' +
                'payment request. Please ensure this isn\'t a ' +
                'duplicate request.');
            window.app.snackbar.view('Sent payment request to ' +
                Utils.getOther(this.appt.attendees).email + '.');
        });
        listen(clockInBtn, () => {
            if (!this.timer) {
                this.clockIn();
                $(this.main).find('#clocking .mdc-fab__label').text('ClockOut');
            } else {
                this.clockOut();
                $(this.main).find('#clocking .mdc-fab__label').text('ClockIn');
            }
        });
        listen(timeBtn, () => new NewTimeRequestDialog({
            appt: this.appt,
            apptId: this.id,
        }).view());
    }

    /**
     * Clocks the current user (i.e. the tutor of the appointment) in by
     * sending a clock-in request to the appointment's location's supervisors.
     * @return {Promise<undefined>} Promise that resolves once the clock-in
     * request has been sent or has failed to send.
     * @todo Add approval/rejection listener based on response to REST API 
     * request (i.e. a snackbar that tells the tutor if their request was
     * rejected or approved).
     */
    async clockIn() {
        const reset = () => {
            clearInterval(this.timer);
            this.timer = null;
            $(this.main).find('.mdc-fab__label').text('ClockIn');
        };
        this.timer = setInterval(() => {
            this.update();
        }, 10);
        if (window.app.user.type === 'Supervisor') {
            window.app.snackbar.view('Clocking in for ' +
                this.appt.for.toUser.name.split(' ')[0] + '...');
            const [e, r] = await to(Data.instantClockIn(this.appt, this.id));
            if (e) {
                reset();
                return window.app.snackbar.view('Could not clock-in.');
            }
            window.app.snackbar.view('Clocked in at ' + new Date(r.clockIn
                .sentTimestamp).toLocaleTimeString() + '.');
        } else {
            const [canceled, proof] = await to(new CaptureProofDialog().view());
            if (canceled) {
                reset();
                return window.app.snackbar.view('Canceled clock-in request.');
            }
            window.app.snackbar.view('Sending request...');
            const [err, res] = await to(
                Data.clockIn(this.appt, this.id, proof));
            if (err) {
                reset();
                return window.app.snackbar.view('Could not send clock-in ' +
                    'request.');
            }
            window.app.snackbar.view('Sent clock-in request to ' +
                res.recipient.name + '.');
            ViewApptDialog.listen(
                res.clockIn.approvedRef,
                res.clockIn.rejectedRef,
                'Clock-In',
                reset,
            );
        }
    }

    /**
     * Function called when a clock-in or clock-out request is rejected that
     * resets the UI as if the request was never sent.
     * @callback resetCallback
     */

    /**
     * Helper function that listens to the clock-in or clock-out request to see
     * when it is approved or rejected.
     * @param {string} approvedRef - The Firestore document reference path of
     * where the approved clock-in or clock-out is going to be created.
     * @param {string} rejectedRef - The Firestore document reference path of
     * where the rejected clock-in or clock-out is going to be created.
     * @param {string} name - Whether it is a clock-in or clock-out (used to set
     * the 
     * [NotificationDialog]{@link module:@tutorbook/dialogs~NotificationDialog} 
     * summary and title).
     * @param {resetCallback} [reset=function() {}] - Callback when the request 
     * is rejected (that resets the UI as if the request was never sent).
     * @example
     * const to = require('await-to-js').default;
     * const [err, res] = await to(Data.clockIn(this.appt, this.id));
     * this.listen(
     *   res.clockIn.approvedRef, 
     *   res.clockIn.rejectedRef, 
     *   'Clock-in',
     *   reset,
     * );
     * @example
     * const to = require('await-to-js').default;
     * const [err, res] = await to(Data.clockOut(this.appt, this.id));
     * this.listen(
     *   res.clockOut.approvedRef, 
     *   res.clockOut.rejectedRef, 
     *   'Clock-out',
     *   reset,
     * );
     */
    static listen(approvedRef, rejectedRef, name, reset = () => {}) {
        const db = firebase.firestore();
        Data.listen(db.doc(approvedRef), doc => {
            if (doc.exists) return window.app.snackbar.view(
                Utils.caps(name.toLowerCase()) + ' request ' +
                'approved by ' + doc.data().approvedBy.name + '.');
        }, err => console.error('[ERROR] Could not listen for approved ' +
            name.toLowerCase() + ' b/c of ', err));
        Data.listen(db.doc(rejectedRef), doc => {
            if (doc.exists) {
                reset();
                new NotificationDialog(name + ' Rejected', 'Your ' +
                    name.toLowerCase() + ' request was rejected by ' +
                    doc.data().rejectedBy.name + '. If you think this is ' +
                    'a mistake, try again or contact ' +
                    doc.data().rejectedBy.name.split(' ')[0] + '.',
                    () => {}).view();
            }
        }, err => console.error('[ERROR] Could not listen for rejected ' +
            name.toLowerCase() + ' b/c of ', err));
    }

    /**
     * Clocks the current user (i.e. the tutor of the appointment) out by
     * sending a clock-out request to the appointment's location's supervisors.
     * @return {Promise<undefined>} Promise that resolves once the clock-out
     * request has been sent or has failed to send.
     * @todo Add approval/rejection listener based on response to REST API 
     * request (i.e. a snackbar that tells the tutor if their request was
     * rejected or approved).
     */
    async clockOut() {
        const reset = () => {
            this.timer = setInterval(() => {
                this.update();
            }, 10);
            $(this.main).find('.mdc-fab__label').text('ClockOut');
        };
        clearInterval(this.timer);
        this.timer = null;
        if (window.app.user.type === 'Supervisor') {
            window.app.snackbar.view('Clocking out for ' +
                this.appt.for.toUser.name.split(' ')[0] + '...');
            const [e, r] = await to(Data.instantClockOut(this.appt, this.id));
            if (e) {
                reset();
                return window.app.snackbar.view('Could not clock-out.');
            }
            window.app.snackbar.view('Clocked out at ' + new Date(r.clockOut
                .sentTimestamp).toLocaleTimeString() + '.');
        } else {
            const [canceled, proof] = await to(new CaptureProofDialog().view());
            if (canceled) {
                reset();
                return window.app.snackbar.view('Canceled clock-out request.');
            }
            window.app.snackbar.view('Sending request...');
            const [err, res] = await to(
                Data.clockOut(this.appt, this.id, proof));
            if (err) {
                reset();
                return window.app.snackbar.view('Could not send clock-out ' +
                    'request.');
            }
            window.app.snackbar.view('Sent clock-out request to ' +
                res.recipient.name + '.');
            window.clockOutRes = res;
            ViewApptDialog.listen(
                res.clockOut.approvedRef,
                res.clockOut.rejectedRef,
                'Clock-Out',
                reset,
            );
        }
    }

    /**
     * Method that is called every millisecond (i.e. with 
     * `window.setInterval(() => this.update(), 10)`) and updates the dialog's 
     * timer text fields to show the tutor a running total of time spent at an 
     * appointment.
     * @see {@link https://www.w3schools.com/jsref/met_win_setinterval.asp}
     */
    update() {
        // Formatted as: Hr:Min:Sec.Millisec
        var currentTimeDisplay = $(this.main).find('#Current input')[0];
        var current = currentTimeDisplay.value.toString();
        var currentHours = new Number(current.split(':')[0]);
        var currentMinutes = new Number(current.split(':')[1]);
        var currentSeconds = new Number(current.split(':')[2].split('.')[0]);
        var currentMilli = new Number(current.split('.')[1]) || 0;

        // Add to currentMilli
        currentMilli++;

        // Parse the current values to ensure they are formatted correctly
        if (currentMilli === 100) {
            currentMilli = 0;
            currentSeconds++;
        }
        if (currentSeconds === 60) {
            currentSeconds = 0;
            currentMinutes++;
        }
        if (currentMinutes === 60) {
            currentMinutes = 0;
            currentHours++;
        }

        currentTimeDisplay.value = currentHours + ':' + currentMinutes +
            ':' + currentSeconds + '.' + currentMilli;

        // Next, update the total time
        // Formatted as: Hr:Min:Sec.Millisec
        var totalTimeDisplay = $(this.main).find('#Total input')[0];
        var total = totalTimeDisplay.value.toString();
        var totalHours = new Number(total.split(':')[0]);
        var totalMinutes = new Number(total.split(':')[1]);
        var totalSeconds = new Number(total.split(':')[2].split('.')[0]);
        var totalMilli = new Number(total.split('.')[1]);

        // Add to totalMilli
        totalMilli++;

        // Parse the total values to ensure they are formatted correctly
        if (totalMilli === 100) {
            totalMilli = 0;
            totalSeconds++;
        }
        if (totalSeconds === 60) {
            totalSeconds = 0;
            totalMinutes++;
        }
        if (totalMinutes === 60) {
            totalMinutes = 0;
            totalHours++;
        }

        totalTimeDisplay.value = totalHours + ':' + totalMinutes +
            ':' + totalSeconds + '.' + totalMilli;
    }
};

/**
 * Class that represents an "Edit Appointment" dialog that enables users to edit
 * their upcoming appointments.
 * @extends EditRequestDialog
 */
class EditApptDialog extends EditRequestDialog {
    constructor(appt, id) {
        super(appt.for, id);
        this.appt = appt;
    }

    async renderSelf() {
        await super.renderSelf();
        if (window.app.user.type === 'Supervisor') {
            $(this.main).find('[id="From ' +
                this.request.fromUser.type.toLowerCase() + '"]').remove();
            $(this.main).find('[id="To ' +
                this.request.toUser.type.toLowerCase() + '"] h4'
            ).text('Attendees');
        }
        this.header = this.render.header('header-action', {
            title: 'Edit Appointment',
            ok: () => {},
        });
    }

    async modifyRequest() {
        window.app.nav.back();
        const [err, res] = await to(Data.modifyAppt(this.appt, this.id));
        if (err) return window.app.snackbar.view('Could not modify ' +
            'appointment.');
        window.app.snackbar.view('Modified appointment.');
    }
};

/**
 * Class that represents a "New Record" or "New Past Appointment" dialog that
 * enables supervisors and admins to record existing past appointments.
 * @extends EditApptDialog
 */
class NewPastApptDialog extends EditApptDialog {
    /**
     * Creates and renders a new `NewPastApptDialog`.
     */
    constructor() {
        const utils = window.app.utils || new Utils();
        const appt = {
            attendees: [],
            for: {
                subject: '',
                fromUser: {},
                toUser: {},
                timestamp: new Date(),
                location: {},
                message: '',
                time: {
                    day: '',
                    from: '',
                    to: '',
                },
                payment: {
                    type: 'Free',
                    method: 'PayPal',
                    amount: 0,
                },
            },
            time: {
                day: '',
                from: '',
                to: '',
            },
            clockIn: {
                sentBy: window.app.conciseUser,
                sentTimestamp: new Date(),
                approvedBy: window.app.conciseUser,
                approvedTimestamp: new Date(),
            },
            clockOut: {
                sentBy: window.app.conciseUser,
                sentTimestamp: new Date(),
                approvedBy: window.app.conciseUser,
                approvedTimestamp: new Date(),
            },
            location: {},
            timestamp: new Date(),
        };
        super(appt, Utils.genID());
    }

    /**
     * Renders the `NewPastApptDialog`'s header and main view (that contains
     * [search text fields]{@link Render#searchTextFieldItem}).
     * @see {@link Render}
     */
    renderSelf() {
        this.header = this.render.header('header-action', {
            title: 'New Record',
            ok: async () => {
                if (!this.valid) return;
                this.appt.time = Utils.cloneMap(this.request.time);
                this.appt.location = Utils.cloneMap(this.request.location);
                window.app.nav.back();
                window.app.snackbar.view('Creating past appointment...');
                const [err, res] = await to(Data.newPastAppt(this.appt));
                if (err) return window.app.snackbar.view('Could not create ' +
                    'past appointment.');
                window.app.snackbar.view('Created past appointment.');
            },
        });
        this.main = this.render.template('dialog-input');

        /**
         * Renders the Algolia hit (a map of user data) as an 
         * [`mdc-list-item`]{@link https://material.io/develop/web/components/lists/}.
         * @memberof NewPastApptDialog
         * @param {Object} hit - The Algolia hit (a map of user data) to render.
         * @param {string} type - The user type to change on this past 
         * appointment (i.e. if type is `Tutor` we change the `toUser` value of 
         * the past appointment's request when the result is clicked).
         * @return {HTMLElement} The rendered (and managed) `mdc-list-item` 
         * search result that modifies this past appointment's attendees when 
         * clicked.
         */
        const renderHit = (hit, type) => {
            const user = Utils.filterProfile(hit);
            const el = window.app.renderHit(hit, this.render).cloneNode(true);
            $(el).find('button').remove();
            el.addEventListener('click', () => {
                this.request[type === 'Tutor' ? 'toUser' : 'fromUser'] = user;
                this.appt.attendees = [
                    Utils.cloneMap(this.request.toUser),
                    Utils.cloneMap(this.request.fromUser),
                ];
                $(this.main).find('#' + type).find('input').val(user.name);
                this.refreshData();
                window.setTimeout(() => {
                    const opp = type === 'Tutor' ? 'Pupil' : 'Location';
                    $(this.main).find('#' + opp + ' input').click();
                    if (opp !== 'Location') this[opp.toLowerCase() +
                        'TextField'].focus();
                }, 50);
            });
            return el;
        };
        const index = Data.algoliaIndex('users');
        /**
         * Searches pupils.
         * @memberof NewPastApptDialog
         * @type {searchCallback}
         * @see {@link searchCallback}
         * @todo Add `Type` facetFilter to Algolia search query.
         */
        const searchPupils = async (textFieldItem) => {
            const query = $(textFieldItem).find('.search-box input').val();
            const res = await index.search({
                query: query,
                facetFilters: !window.app.id ? [] : [
                    'payments.type:Free', // TODO: Add `Type` facetFilter here.
                    window.app.locations.map(l => 'location:' + l.name),
                ],
            });
            $(textFieldItem).find('#results').empty();
            res.hits.forEach((hit) => {
                try {
                    $(textFieldItem).find('#results').append(
                        renderHit(hit, 'Pupil'));
                } catch (e) {
                    console.warn('[ERROR] Could not render hit (' +
                        hit.objectID + ') b/c of', e);
                }
            });
        };
        /**
         * Searches tutors.
         * @memberof NewPastApptDialog
         * @type {searchCallback}
         * @see {@link searchCallback}
         * @todo Add `Type` facetFilter to Algolia search query.
         */
        const searchTutors = async (textFieldItem) => {
            const query = $(textFieldItem).find('.search-box input').val();
            const res = await index.search({
                query: query,
                facetFilters: !window.app.id ? [] : [
                    'payments.type:Free', // TODO: Add `Type` facetFilter here.
                    window.app.locations.map(l => 'location:' + l.name),
                ],
            });
            $(textFieldItem).find('#results').empty();
            res.hits.forEach((hit) => {
                try {
                    $(textFieldItem).find('#results').append(
                        renderHit(hit, 'Tutor'));
                } catch (e) {
                    console.warn('[ERROR] Could not render hit (' +
                        hit.objectID + ') b/c of', e);
                }
            });
        };
        const add = (e) => {
            this.main.appendChild(e);
        };
        const addD = (label) => {
            add(this.render.listDivider(label));
        };
        const addST = (label, val, search) => {
            add(this.render.searchTextFieldItem(label, val, search));
        };
        const addS = (l, v = '', d = []) => {
            add(this.render.selectItem(l, v, Utils.concatArr([v], d)));
        };
        const t = (label, val = new Date().toLocaleTimeString()) => {
            return this.render.textField(label, val);
        };

        addD('Attendees');
        addST('Tutor', '', searchTutors);
        addST('Pupil', '', searchPupils);
        addD('At');
        addS('Location');
        addS('Day');
        addS('Time');
        add(this.render.splitListItem(
            t('Date', new Date().toLocaleDateString()),
            t('Clock-in'),
            t('Clock-out'),
        ));
        add(this.render.textFieldItem('Time clocked', '00:00:00.00'));
        addD('For');
        addS('Subject');
        add(this.render.textAreaItem('Message', ''));
    }

    /**
     * Updates this past appointment's clocking `Date`s based on the clock-in 
     * and clock-out text field values.
     * @todo Refactor this code and get rid of repetitive helper function 
     * definitions (e.g. move them to more detailed names under utils).
     */
    updateClockingTimes() {
        const timestring = (str) => {
            const split = str.split(' ');
            split[0] += ':00';
            return split.join(' ');
        };
        const parse = (val) => {
            const split = val.split(':');
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            try {
                const parsed = parse(val);
                if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
                if (!(0 <= parsed.mins && parsed.mins < 60)) return false;
                if (!(0 <= parsed.secs && parsed.mins < 60)) return false;
                if (!(0 <= parsed.hrs && parsed.hrs <= 12)) return false;
                return true;
            } catch (e) {
                return false;
            }
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        const editTime = async (t) => {
            const request = t.root_.id === 'Clock-in' ? this.appt.clockIn : this
                .appt.clockOut;
            if (!valid(t.value)) return setTimeout(() => t.valid = false, 50);
            update(t.value, request.sentTimestamp);
            update(t.value, request.approvedTimestamp);
            $(this.main).find('[id="Time clocked"] input').val(
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp,
                    this.appt.clockOut.sentTimestamp,
                ));
        };

        this.clockInTextField.value = timestring(this.request.time.from);
        this.clockOutTextField.value = timestring(this.request.time.to);
        editTime(this.clockInTextField);
        editTime(this.clockOutTextField);
    }

    /**
     * Refreshes what times (days and timeslots), subjects, and locations can
     * be selected based on this appointment's attendees's data.
     */
    refreshData() {
        const s = (q) => { // Attach select based on query
            return Utils.attachSelect($(this.main).find(q)[0]);
        };
        const listen = (s, action) => { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };
        const a = (q, action) => { // Attaches select and adds listener
            return listen(s(q), action);
        };
        const r = (q, el, action, id) => { // Replaces select and adds listener
            $(el).find('.mdc-list-item').each(function() {
                MDCRipple.attachTo(this);
            });
            $(this.main).find(q).replaceWith(el);
            return a(q, action);
        };

        this.availability = Utils.combineAvailability(this.request.fromUser
            .availability, this.request.toUser.availability);
        const names = Object.keys(this.availability);
        if (names.length === 1) this.request.location = {
            name: names[0],
            id: window.app.data.locationsByName[names[0]],
        };
        this.locationSelect = r(
            '#Location',
            this.render.select('Location', this.request.location.name, names),
            s => {
                const locationIDs = window.app.data.locationsByName;
                if (!locationIDs[s.value]) return s.valid = false;
                this.request.location = {
                    name: s.value,
                    id: locationIDs[s.value],
                };
                this.refreshDayAndTimeSelects(this.request, this.availability);
            });
        if (names.length === 1 && !window.app.data.locationsByName[names[0]])
            this.locationSelect.valid = false;

        this.subjects = Utils.concatArr(this.request.fromUser.subjects, this
            .request.toUser.subjects);
        if (this.subjects.length === 1) this.request.subject = this.subjects[0];
        this.subjectSelect = r(
            '#Subject',
            this.render.select('Subject', this.request.subject, this.subjects),
            s => this.request.subject = s.value,
        );

        this.req = this.req.filter(r => ['Location', 'Subject']
            .indexOf(r.id) < 0);
        this.req.push({
            input: this.subjectSelect,
            id: 'Subject',
            valid: () => this.subjectSelect.value !== '',
        });
        this.req.push({
            input: this.locationSelect,
            id: 'Location',
            valid: () => window.app.data.locationsByName[this.locationSelect
                .value],
        });
        this.refreshDayAndTimeSelects(this.request, this.availability);
    }

    /**
     * Attaches the `MDCRipple`s, 
     * [`MDCTextField`]{@link https://material.io/develop/web/components/input-controls/text-field/}s, 
     * [`MDCSelect`]{@link https://material.io/develop/web/components/input-controls/select-menus/}s, and the view's 
     * [`MDCTopAppBar`]{@link https://material.io/develop/web/components/top-app-bar/}.
     * @todo Why do we have to set a timeout for all of field invalidation?
     * @todo Find a better way to workaround the fact that when the user clicks 
     * on a result the text field unfocuses and causes it to be marked as 
     * invalid (as the result clicker hasn't updated our data).
     * @todo Refactor this function into smaller, more scoped/granular 
     * management functions.
     */
    manage() {
        const t = (q, action, i = 'input') => {
            const t = new MDCTextField($(this.main).find(q).first()[0]);
            $(this.main).find(q + ' ' + i).first().focusout(() => action(t));
            return t;
        };
        const s = (q) => { // Attach select based on query
            return Utils.attachSelect($(this.main).find(q)[0]);
        };
        const listen = (s, action) => { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };
        const a = (q, action) => { // Attaches select and adds listener
            return listen(s(q), action);
        };
        const parse = (val) => {
            const split = val.split(':');
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            try {
                const parsed = parse(val);
                if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
                if (!(0 <= parsed.mins && parsed.mins < 60)) return false;
                if (!(0 <= parsed.secs && parsed.mins < 60)) return false;
                if (!(0 <= parsed.hrs && parsed.hrs <= 12)) return false;
                return true;
            } catch (e) {
                return false;
            }
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        const editTime = async (t) => {
            const request = t.root_.id === 'Clock-in' ? this.appt.clockIn : this
                .appt.clockOut;
            if (!valid(t.value)) return setTimeout(() => t.valid = false, 50);
            update(t.value, request.sentTimestamp);
            update(t.value, request.approvedTimestamp);
            $(this.main).find('[id="Time clocked"] input').val(
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp,
                    this.appt.clockOut.sentTimestamp,
                ));
        };
        const editDate = (t) => {
            const newDate = new Date(t.value);
            if (newDate.toString() === 'Invalid Date')
                return setTimeout(() => t.valid = false, 50);
            [this.appt.clockIn, this.appt.clockOut].forEach(oldDate => {
                ['sentTimestamp', 'approvedTimestamp'].forEach(key => {
                    oldDate[key].setDate(newDate.getDate());
                    oldDate[key].setFullYear(newDate.getFullYear());
                    oldDate[key].setMonth(newDate.getMonth());
                });
            });
        };

        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('.mdc-icon-button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        }).end().find('.mdc-select,.search-results li').each(function() {
            MDCRipple.attachTo(this);
        });

        // TODO: Why do we have to set a timeout for all of this invalidation?
        // TODO: Find a better way to workaround the fact that when the user 
        // clicks on a result the text field unfocuses and causes it to be 
        // marked as invalid (as the result clicker hasn't updated our data).
        this.tutorTextField = t('#Tutor', t => setTimeout(() => {
            if (!Object.keys(this.request.toUser).length)
                setTimeout(() => t.valid = false, 50);
        }, 500));
        this.pupilTextField = t('#Pupil', t => setTimeout(() => {
            if (!Object.keys(this.request.fromUser).length)
                setTimeout(() => t.valid = false, 50);
        }, 500));
        this.locationSelect = a('#Location', (s) => {
            const locationIDs = window.app.data.locationsByName;
            if (!locationIDs[s.value]) return s.valid = false;
            this.request.location = {
                name: s.value,
                id: locationIDs[s.value],
            };
            this.refreshDayAndTimeSelects(this.request, this.availability);
        });
        this.daySelect = a('#Day', (s) => {
            this.val.day = s.value;
            this.refreshTimeSelects(this.request, this.availability);
        });
        this.timeslotSelect = a('#Time', (s) => {
            if (s.value.split(' to ').length > 1) {
                this.request.time.from = s.value.split(' to ')[0];
                this.request.time.to = s.value.split(' to ')[1];
            } else {
                this.request.time.from = s.value;
                this.request.time.to = s.value;
            }
            this.updateClockingTimes();
        });
        this.subjectSelect = a('#Subject', s => this.request.subject = s.value);
        this.messageTextField = t('#Message', t => this.request.message = t
            .value, 'textarea');
        this.dateTextField = t('#Date', t => editDate(t));
        this.clockInTextField = t('[id="Clock-in"]', t => editTime(t));
        this.clockOutTextField = t('[id="Clock-out"]', t => editTime(t));
        this.durationTextField = t('[id="Time clocked"]', t => {});
        $(this.main).find('[id="Time clocked"] input').attr('disabled', true);

        [
            this.tutorTextField, this.pupilTextField, this.subjectSelect,
            this.daySelect, this.timeslotSelect,
        ].forEach(input => {
            this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => input.value !== '',
            });
        });
        this.req.push({
            input: this.locationSelect,
            id: 'Location',
            valid: () => window.app.data.locationsByName[this.locationSelect
                .value],
        });
        this.req.push({
            input: this.dateTextField,
            id: 'Date',
            valid: () => new Date(this.dateTextField.value).toString() !==
                'Invalid Date',
        });
        this.req.push({
            input: this.tutorTextField,
            id: 'Tutor',
            valid: () => Object.keys(this.request.toUser).length,
        });
        this.req.push({
            input: this.pupilTextField,
            id: 'Pupil',
            valid: () => Object.keys(this.request.fromUser).length,
        });
        [this.clockInTextField, this.clockOutTextField].forEach(input => {
            this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => valid(input.value),
            });
        });
    }
};

/**
 * Class that represents the "Past Appointment" dialog in our web app.
 * @extends ViewApptDialog
 */
class ViewPastApptDialog extends ViewApptDialog {
    /**
     * Creates and renders a new "Past Appointment" dialog by calling
     * [this.updateRender]{@link ViewPastApptDialog#updateRender} when we
     * finish our initial rendering.
     */
    constructor(appt, id) {
        super(appt, id);
        this.updateRender();
    }

    /**
     * Renders the past appointment dialog by replacing the top app bar text.
     * Note that much of the actual changes occur in 
     * [this.updateRender]{@link ViewPastApptDialog#updateRender} when we know 
     * that we have a `this.appt` [Appointment]{@link Appointment} object to 
     * work with.
     */
    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Past Appointment',
            showDelete: true,
            delete: () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment between ' + this.appt.attendees[0].name +
                    ' and ' + this.appt.attendees[1].name + '? This action ' +
                    'cannot be undone.', async () => {
                        window.app.snackbar.view('Deleting past ' +
                            'appointment...');
                        window.app.nav.back();
                        const [err, res] = await to(
                            Data.deletePastAppt(this.appt, this.id));
                        if (err) return window.app.snackbar.view('Could not ' +
                            'delete past appointment.');
                        window.app.snackbar.view('Deleted past appointment.');
                    }).view();
            },
        });
    }

    /**
     * Waits until we're sure that we have a `this.appt` object to work with
     * before adding the "Time clocked" dialog section (that shows the times 
     * clocked and is editable by supervisors) and removing any FABs.
     */
    async updateRender() {
        if (this.appt.for.fromUser.name === 'Pupil Tutorbook')
            window.viewPastApptDialog = this;
        await this.rendering;
        $(this.render.splitListItem(
            this.render.textField(
                'Actual duration',
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp.toDate(),
                    this.appt.clockOut.sentTimestamp.toDate(),
                )),
            this.render.textField(
                'Rounded duration',
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.roundedTimestamp ?
                    this.appt.clockIn.roundedTimestamp.toDate() :
                    this.appt.clockIn.sentTimestamp.toDate(),
                    this.appt.clockOut.roundedTimestamp ?
                    this.appt.clockOut.roundedTimestamp.toDate() :
                    this.appt.clockOut.sentTimestamp.toDate(),
                )),
        )).insertAfter($(this.main).find('#Current').parent());
        $(this.main).find('#Current').replaceWith($(this.render.textField(
                'Clock-in',
                this.appt.clockIn.sentTimestamp.toDate().toLocaleTimeString()
            )).attr('style', 'margin-right:20px;')).end()
            .find('#Total').replaceWith(this.render.textField(
                'Clock-out',
                this.appt.clockOut.sentTimestamp.toDate().toLocaleTimeString()
            )).end().find('.mdc-fab').remove();
    }

    /**
     * Manages the view past appointment dialog by enabling supervisors to edit
     * the clock-in and clock-out times (which changes the "Actual duration"
     * accordingly).
     * @todo Add duration editing (such that a supervisor can just direcly edit
     * the duration and the dates are changed accordingly).
     */
    manage() {
        super.manage();
        if (window.app.user.type !== 'Supervisor') return;
        const parse = (val) => {
            const split = val.split(':');
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            try {
                const parsed = parse(val);
                if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
                if (!(0 <= parsed.mins && parsed.mins < 60)) return false;
                if (!(0 <= parsed.secs && parsed.mins < 60)) return false;
                if (!(0 <= parsed.hrs && parsed.hrs <= 12)) return false;
                return true;
            } catch (e) {
                return false;
            }
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        // TODO: Right now we only change the sentTimestamp. We want to change
        // the sentTimestamp and the approvedTimestamp relative to each other.
        const editClockingTime = async (id) => {
            if (this.appt.clockIn.sentTimestamp.toDate) this.appt.clockIn
                .sentTimestamp = this.appt.clockIn.sentTimestamp.toDate();
            if (this.appt.clockOut.sentTimestamp.toDate) this.appt.clockOut
                .sentTimestamp = this.appt.clockOut.sentTimestamp.toDate();
            const date = id === 'Clock-in' ? this.appt.clockIn.sentTimestamp :
                this.appt.clockOut.sentTimestamp;
            const t = this.textFields[id];
            const v = t.value;
            if (!valid(v)) return setTimeout(() => t.valid = false, 50);
            update(v, date);
            window.app.snackbar.view('Updating past appointment...');
            $(this.main).find('[id="Actual duration"] input').val(
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp,
                    this.appt.clockOut.sentTimestamp,
                ));
            const [err, res] = await to(Data.modifyPastAppt(this.appt,
                this.id));
            if (err) return window.app.snackbar.view('Could not update past ' +
                'appointment.');
            window.app.snackbar.view('Updated past appointment.');
        };
        $(this.main).find('[id="Clock-in"] input').removeAttr('disabled')
            .focusout(async () => {
                editClockingTime('Clock-in', this.appt.clockIn.sentTimestamp);
            }).end()
            .find('[id="Clock-out"] input').removeAttr('disabled')
            .focusout(async () => {
                editClockingTime('Clock-out', this.appt.clockOut.sentTimestamp);
            }).end()
            .find('[id="Actual duration"] input') // TODO: Add duration editing.
            .focusout(async () => {
                console.log('[TODO] Add duration editing data handling.');
            });
    }
};

/**
 * Class that represents the "View Time Request" dialog in our web app that
 * enables peer tutoring supervisors to:
 * 1. Review time request proof.
 * 2. Update the clock-in and clock-out times.
 * 3. Approve the time request and log service hours.
 */
class ViewTimeRequestDialog extends ViewPastApptDialog {
    constructor(request, id) {
        super(request.appt, id);
    }

    manage() {
        super.super.manage();
    }
};

/**
 * Class that represents our "Active Appointment" dialog.
 * @extends ViewApptDialog
 */
class ViewActiveApptDialog extends ViewApptDialog {
    /**
     * Renders the "Active Appointment" dialog by:
     * - Replacing the "Appointment" header title with text that reads "Active
     *   Appointment".
     * - Changing the text on the clock-in FAB.
     */
    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Active Appointment',
        });
        $(this.main).find('.mdc-fab__label').text('ClockOut');
    }

    /**
     * Manages the "Active Appointment" dialog by:
     * - Prefilling the timer text fields based (i.e. the appointment has
     *   already been going for a while now so don't start at "0:00:00").
     * - Starting the timer `setTimeout` function that updates the timer text
     *   fields every 10 milliseconds.
     */
    manage() {
        super.manage();
        const clockIn = !(this.appt.clockIn.sentTimestamp instanceof Date) ?
            this.appt.clockIn.sentTimestamp.toDate() :
            this.appt.clockIn.sentTimestamp;
        const now = new Date();
        const timeString = Utils.getDurationStringFromDates(clockIn, now);
        $(this.main)
            .find('#Total input').val(timeString).end()
            .find('#Current input').val(timeString).end();
        this.timer = setInterval(() => this.update(), 10);
    }
};

class ViewCanceledApptDialog extends ViewApptDialog {
    constructor(appt) {
        super(appt.for);
        this.canceledAppt = appt;
    }

    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Canceled Appointment',
        });
        $(this.main)
            .find('[id="Hours clocked"]').remove().end()
            .find('#Current').parent().remove().end()
            .find('.mdc-fab').remove();
    }
};

module.exports = {
    viewTimeRequest: ViewTimeRequestDialog,
    viewRequest: ViewRequestDialog,
    viewModifiedRequest: ViewModifiedRequestDialog,
    viewCanceledRequest: ViewCanceledRequestDialog,
    viewRejectedRequest: ViewRejectedRequestDialog,
    editRequest: EditRequestDialog,
    newRequest: NewRequestDialog,
    paidRequest: PaidRequestDialog,
    stripeRequest: StripeRequestDialog,
    viewAppt: ViewApptDialog,
    editAppt: EditApptDialog,
    viewPastAppt: ViewPastApptDialog,
    newPastAppt: NewPastApptDialog,
    viewActiveAppt: ViewActiveApptDialog,
    viewCanceledAppt: ViewCanceledApptDialog,
    notify: NotificationDialog,
    editSubjects: EditSubjectsDialog,
    selectSubject: SubjectSelectDialog,
    editAvailability: EditAvailabilityDialog,
    confirm: ConfirmationDialog,
    editLocation: EditLocationDialog,
    newLocation: NewLocationDialog,
};