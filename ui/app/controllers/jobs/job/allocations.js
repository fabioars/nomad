/* eslint-disable ember/no-incorrect-calls-with-inline-anonymous-functions */
import { alias } from '@ember/object/computed';
import Controller from '@ember/controller';
import { action, computed } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';
import intersection from 'lodash.intersection';
import Sortable from 'nomad-ui/mixins/sortable';
import Searchable from 'nomad-ui/mixins/searchable';
import WithNamespaceResetting from 'nomad-ui/mixins/with-namespace-resetting';
import { serialize, deserializedQueryParam as selection } from 'nomad-ui/utils/qp-serialize';
import classic from 'ember-classic-decorator';

@classic
export default class AllocationsController extends Controller.extend(
  /*eslint-disable  indent */
  Sortable,
  Searchable,
  WithNamespaceResetting
) {
  queryParams = [
    {
      currentPage: 'page',
    },
    {
      searchTerm: 'search',
    },
    {
      sortProperty: 'sort',
    },
    {
      sortDescending: 'desc',
    },
    {
      qpStatus: 'status',
    },
    {
      qpClient: 'client',
    },
    {
      qpTaskGroup: 'taskGroup',
    },
    {
      qpJobVersion: 'jobVersion',
    },
  ];

  qpStatus = '';
  qpClient = '';
  qpTaskGroup = '';
  qpJobVersion = '';
  currentPage = 1;
  pageSize = 25;

  sortProperty = 'modifyIndex';
  sortDescending = true;

  @alias('model') job;

  @computed
  get searchProps() {
    return ['shortId', 'name', 'taskGroupName'];
  }

  @computed(
    'model.allocations.[]',
    'selectionStatus',
    'selectionClient',
    'selectionTaskGroup',
    'selectionJobVersion'
  )
  get allocations() {
    const allocations = this.get('model.allocations') || [];
    const { selectionStatus, selectionClient, selectionTaskGroup, selectionJobVersion } = this;

    if (!allocations.length) return allocations;

    return allocations.filter(alloc => {
      if (selectionStatus.length && !selectionStatus.includes(alloc.clientStatus)) {
        return false;
      }
      if (selectionClient.length && !selectionClient.includes(alloc.get('node.shortId'))) {
        return false;
      }
      if (selectionTaskGroup.length && !selectionTaskGroup.includes(alloc.taskGroupName)) {
        return false;
      }
      if (selectionJobVersion.length && !selectionJobVersion.includes(alloc.jobVersion)) {
        return false;
      }
      return true;
    });
  }

  @selection('qpStatus') selectionStatus;
  @selection('qpClient') selectionClient;
  @selection('qpTaskGroup') selectionTaskGroup;
  @selection('qpJobVersion') selectionJobVersion;

  @alias('allocations') listToSort;
  @alias('listSorted') listToSearch;
  @alias('listSearched') sortedAllocations;

  @action
  gotoAllocation(allocation) {
    this.transitionToRoute('allocations.allocation', allocation);
  }

  get optionsAllocationStatus() {
    return [
      { key: 'queued', label: 'Queued' },
      { key: 'starting', label: 'Starting' },
      { key: 'running', label: 'Running' },
      { key: 'complete', label: 'Complete' },
      { key: 'failed', label: 'Failed' },
      { key: 'lost', label: 'Lost' },
    ];
  }

  @computed('model.allocations.[]', 'selectionClient')
  get optionsClients() {
    const clients = Array.from(new Set(this.model.allocations.mapBy('node.shortId'))).compact();

    // Update query param when the list of clients changes.
    scheduleOnce('actions', () => {
      // eslint-disable-next-line ember/no-side-effects
      this.set('qpClient', serialize(intersection(clients, this.selectionClient)));
    });

    return clients.sort().map(c => ({ key: c, label: c }));
  }

  @computed('model.allocations.[]', 'selectionTaskGroup')
  get optionsTaskGroups() {
    const taskGroups = Array.from(new Set(this.model.allocations.mapBy('taskGroupName'))).compact();

    // Update query param when the list of clients changes.
    scheduleOnce('actions', () => {
      // eslint-disable-next-line ember/no-side-effects
      this.set('qpTaskGroup', serialize(intersection(taskGroups, this.selectionTaskGroup)));
    });

    return taskGroups.sort().map(tg => ({ key: tg, label: tg }));
  }

  @computed('model.allocations.[]', 'selectionJobVersion')
  get optionsJobVersions() {
    const jobVersions = Array.from(new Set(this.model.allocations.mapBy('jobVersion'))).compact();

    // Update query param when the list of clients changes.
    scheduleOnce('actions', () => {
      // eslint-disable-next-line ember/no-side-effects
      this.set('qpJobVersion', serialize(intersection(jobVersions, this.selectionJobVersion)));
    });

    return jobVersions.sort().map(jv => ({ key: jv, label: jv }));
  }

  setFacetQueryParam(queryParam, selection) {
    this.set(queryParam, serialize(selection));
  }
}
