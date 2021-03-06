/*! *****************************************************************************
SPDX-License-Identifier: Apache-2.0


Copyright (c) Mycroft AI Inc. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Status values that can be expected in the install status endpoint response.
type InstallStatus = 'failed' | 'installed' | 'installing' | 'uninstalling';

export interface SkillInstallStatus {
    [key: string]: InstallStatus;
}

export interface FailureReason {
    [key: string]: string;
}

export interface Installations {
    failureReasons: FailureReason;
    installStatuses: SkillInstallStatus;
}

const inProgressStatuses = ['installing', 'uninstalling', 'failed'];
const installStatusUrl = '/api/skills/status';
const installerSettingsUrl = '/api/skills/install';

@Injectable({
    providedIn: 'root'
})
export class InstallService {
    public failureReasons: FailureReason;
    public installStatuses = new Subject<SkillInstallStatus>();
    public newInstallStatuses: SkillInstallStatus;
    private prevInstallStatuses: SkillInstallStatus;
    public statusNotifications = new Subject<string[]>();

    constructor(private http: HttpClient) { }

    /** Issue API call to get the current state of skill installations */
    getSkillInstallations() {
        this.http.get<Installations>(installStatusUrl).subscribe(
            (installations) => {
                if (installations) {
                    this.newInstallStatuses = installations.installStatuses;
                    this.failureReasons = installations.failureReasons;
                    this.applyInstallStatusChanges();
                    this.checkInstallationsInProgress();
                }
            }
        );
    }

    /** Emit changes to install statuses */
    applyInstallStatusChanges() {
        if (this.prevInstallStatuses) {
            Object.keys(this.prevInstallStatuses).forEach(
                (skillId) => { this.compareStatuses(skillId); }
            );
        }
        this.prevInstallStatuses = this.newInstallStatuses;
        this.installStatuses.next(this.newInstallStatuses);
    }

    /** Compare the new status to the previous status looking for changes
     *
     * There is a race condition where the skill status on the device may not
     * change between the time a user clicks a button in the marketplace and
     * the next call of the status endpoint.
     *
     * For example, there is a period of time between the install button
     * on the marketplace being clicked and device(s) retrieving that request.
     * If the skill status endpoint is called within this time frame the status
     * on the response object will not be 'installing'.  This would result in
     * the status reverting to its previous state.
     *
     * To combat this, we check that skill status changes follow a predefined
     * progression before reflecting the status change on the UI.
     */
    compareStatuses(skillId: string) {
        const prevSkillStatus = this.prevInstallStatuses[skillId];
        const  newSkillStatus = this.newInstallStatuses[skillId];

        switch (prevSkillStatus) {
            case ('installing'): {
                if (newSkillStatus === 'installed') {
                    this.statusNotifications.next([skillId, newSkillStatus]);
                } else if (newSkillStatus === 'failed') {
                    this.statusNotifications.next([skillId, 'install failed']);
                } else {
                    this.newInstallStatuses[skillId] = prevSkillStatus;
                }
                break;
            }
            case ('uninstalling'): {
                if (!newSkillStatus) {
                    this.statusNotifications.next([skillId, 'uninstalled']);
                } else if (newSkillStatus === 'failed') {
                    this.statusNotifications.next([skillId, 'uninstall failed']);
                } else {
                    this.newInstallStatuses[skillId] = prevSkillStatus;
                }
                break;
            }
            case ('failed'): {
                if (!newSkillStatus) {
                    this.statusNotifications.next([skillId, 'uninstalled']);
                } else if (newSkillStatus !== 'installed') {
                    this.statusNotifications.next([skillId, newSkillStatus]);
                } else {
                    this.newInstallStatuses[skillId] = prevSkillStatus;
                }
                break;
            }
        }
    }

    /***
     * Return the install status for the specified skill.
     *
     * System skills are treated differently than installed skills because they
     * cannot be removed from the device.  This function will make the differentiation.
     *
     * @param skillName: unique name of skill being installed
     * @param isSystemSkill: skill that has a "system" tag
     * @param installStatuses: object containing all device skills and their status
     */
    getSkillInstallStatus(
            skillName: string,
            isSystemSkill: boolean,
            installStatuses: SkillInstallStatus
    ) {
        let installStatus: string;

        if (isSystemSkill) {
            installStatus = 'system';
        } else {
            installStatus = installStatuses[skillName];
        }

        return installStatus;
    }

    /** Poll at an interval to check the status of install/uninstall requests
     *
     * We want to avoid polling if we don't need it.  Only poll if waiting for
     * the result of a requested install/uninstall.
     */
    checkInstallationsInProgress() {
        const inProgress = Object.values(this.newInstallStatuses).filter(
            (installStatus) => inProgressStatuses.includes(installStatus)
        );
        if (inProgress.length > 0) {
            setTimeout(() => { this.getSkillInstallations(); }, 10000);
        }
    }

    /**
     * Call the API to add a skill to the Installer skill's 'to_install' setting.
     *
     * @param skillDisplayId: the UUID of the skill being installed
     */
    addToInstallQueue(skillDisplayId: string): Observable<Object> {
        return this.http.put<Object>(
            installerSettingsUrl,
            {
                section: 'to_install',
                skillDisplayId: skillDisplayId
            }
        );
    }

    /**
     * Call the API to add a skill to the Installer skill's 'to_remove' setting.
     *
     * @param skillName: the skill being removed
     */
    addToUninstallQueue(skillName: string): Observable<Object> {
        return this.http.put<Object>(
            installerSettingsUrl,
            {
                section: 'to_remove',
                skill_name: skillName
            }
        );
    }
}
