/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: BUSL-1.1
 */

// @ts-check
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import messageFromAdapterError from 'nomad-ui/utils/message-from-adapter-error';

export default class TokenEditorComponent extends Component {
  @service notifications;
  @service router;
  @service store;
  @service system;

  @alias('args.roles') roles;
  @alias('args.token') activeToken;
  @alias('args.policies') policies;

  @tracked tokenPolicies = [];
  @tracked tokenRoles = [];

  /**
   * When creating a token, it can be made global (has access to all regions),
   * or non-global. If it's non-global, it can be scoped to a specific region.
   * By default, the token is created in the active region of the UI.
   * @type {string}
   */
  @tracked tokenRegion = '';

  // when this renders, set up tokenPolicies
  constructor() {
    super(...arguments);
    this.tokenPolicies = this.activeToken.policies.toArray() || [];
    this.tokenRoles = this.activeToken.roles.toArray() || [];
    if (this.activeToken.isNew) {
      this.activeToken.expirationTTL = 'never';
    }
    this.tokenRegion = this.system.activeRegion;
  }

  @action updateTokenPolicies(policy, event) {
    let { checked } = event.target;
    if (checked) {
      this.tokenPolicies.push(policy);
    } else {
      this.tokenPolicies = this.tokenPolicies.filter((p) => p !== policy);
    }
  }

  @action updateTokenRoles(role, event) {
    let { checked } = event.target;
    if (checked) {
      this.tokenRoles.push(role);
    } else {
      this.tokenRoles = this.tokenRoles.filter((p) => p !== role);
    }
  }

  @action updateTokenType(event) {
    let tokenType = event.target.id;
    this.activeToken.type = tokenType;
  }

  @action updateTokenExpirationTime(event) {
    // Override expirationTTL if user selects a time
    this.activeToken.expirationTTL = null;
    this.activeToken.expirationTime = new Date(event.target.value);
  }
  @action updateTokenExpirationTTL(event) {
    // Override expirationTime if user selects a TTL
    this.activeToken.expirationTime = null;
    if (event.target.value === 'never') {
      this.activeToken.expirationTTL = null;
    } else if (event.target.value === 'custom') {
      this.activeToken.expirationTime = new Date();
    } else {
      this.activeToken.expirationTTL = event.target.value;
    }
  }

  @action updateTokenLocality(event) {
    this.tokenRegion = event.target.id;
  }

  @action async save() {
    try {
      const shouldRedirectAfterSave = this.activeToken.isNew;

      this.activeToken.policies = this.tokenPolicies;
      this.activeToken.roles = this.tokenRoles;

      if (this.activeToken.type === 'management') {
        // Management tokens cannot have policies or roles
        this.activeToken.policyIDs = [];
        this.activeToken.policyNames = [];
        this.activeToken.policies = [];
        this.activeToken.roles = [];
      }

      if (this.tokenRegion === 'global') {
        this.activeToken.global = true;
      } else {
        this.activeToken.global = false;
      }

      // Sets to "never" for auto-selecting the radio button;
      // if it gets updated by the user, will fall back to "" to represent
      // no expiration. However, if the user never updates it,
      // it stays as the string "never", where the API expects a null value.
      if (this.activeToken.expirationTTL === 'never') {
        this.activeToken.expirationTTL = null;
      }

      const adapterRegion = this.activeToken.global
        ? this.system.get('defaultRegion.region')
        : this.tokenRegion;

      await this.activeToken.save({
        adapterOptions: adapterRegion ? { region: adapterRegion } : {},
      });

      this.notifications.add({
        title: 'Token Saved',
        color: 'success',
      });

      if (shouldRedirectAfterSave) {
        this.router.transitionTo(
          'administration.tokens.token',
          this.activeToken.id
        );
      }
    } catch (err) {
      let message = err.errors?.length
        ? messageFromAdapterError(err)
        : err.message;

      this.notifications.add({
        title: `Error creating Token ${this.activeToken.name}`,
        message,
        color: 'critical',
        sticky: true,
      });
    }
  }
}
