# LandPKS Offline Architecture

This document is intended as a primer for Terraso LandPKS developers on the history and architecture of offline mode functionality for the Terraso LandPKS app. It should be supplemented with team discussions and other more in-depth documents from the development process.

- [LandPKS Offline Architecture](#landpks-offline-architecture)
  - [I. Background](#i-background)
  - [II. Approach](#ii-approach)
  - [III. Implementation](#iii-implementation)
    - [a. Connectivity](#a-connectivity)
    - [b. Persistence](#b-persistence)
    - [c. Business rules](#c-business-rules)
    - [d. Tracking and Pushing changes](#d-tracking-and-pushing-changes)
      - [Revision tracking](#revision-tracking)
      - [Revision lifecycle](#revision-lifecycle)
      - [Sending changes to server](#sending-changes-to-server)
      - [Processing changes on server](#processing-changes-on-server)
    - [e. Pulling changes](#e-pulling-changes)
      - [Loading changes from server](#loading-changes-from-server)
      - [Handling changes while app is running](#handling-changes-while-app-is-running)
    - [f. Additional concern: Soil ID](#f-additional-concern-soil-id)
      - [Implementation](#implementation)

## I. Background

Since the Terraso LandPKS app is intended for use with intermittent - or no - connectivity, it requires certain functionality to be available without an Internet connection. We need to support core use-cases for gathering and managing data in the field, and be able to reconcile user actions that are taken offline with the state of the app when they return to being online.

This motivation poses several challenges:

- How to make existing data readable offline?
- How to make new data writable offline?
  - We depend on the backend and database for many permissions, state-consistency, ID generation concerns
- How to have easy-to-understand business logic and conflict resolution policies?
  - Ad-hoc spaghetti code vs. centralized decision-making

We also had to navigate these challenges within the following constraints:

- Data traffic should remain minimal, as user personas are often still dealing with limited data availability
- App had existing data lifecycle; full offline-first rearchitecture was not feasible
- Limited resources in general; app-wide general solution was not feasible either
- Lack of experience; this was the team's first time building offline support into an existing mobile app

## II. Approach

The team performed initial research to inform our process. Perticularly relevant reading for more background:

- https://developer.android.com/topic/architecture/data-layer/offline-first
- https://www.whitespectre.com/ideas/how-to-build-offline-first-react-native-apps-with-react-query-and-typescript/
- TODO(@shrouxm, @knipec): Any other reading that was helpful to you

We then partitioned the problem of offline data into the following areas of concern.

1. Detecting connectivity

   - The client must have the ability to determine when it does or does not have an internet connection, so that it can accordingly enable or disable features or execute necessary actions when connectivity state changes.

1. Persisting data locally

   - The user must be able to continue to access any data that is already available to them across app usage sessions.

1. Supporting business operations without server interactions

   - Any user actions which previously involved round-trips to the server should be reimplemented as client-side actions with equivalent rules. The server remains the authority on the canonical state of data, but the mobile client is now responsible for handling immediate requests both in online and offline mode to ensure consistent behavior in both contexts. (This could be described as an offline-first achitecture of limited scope.)

1. Tracking and sending client changes to the server for reconciliation (referred to as **Push** operations.)

   - Accumulated user changes must be transmitted to the server, which remains the true authority on the canonical state of Terraso LandPKS data. The server's view of data must take precedence over whatever the results of intermediate locally-executed business logic was.

1. Reading server changes from the client for reconciliation (referred to as **Pull** operations.)

   - The server must be queried for a full view of updated state, which the client must then display to the user. This needs to occur when the user first comes online, and it should be able to periodically occur during regular online-mode operation.

TODO(@shrouxm, @knipec): any additional documents (the Mural?) to embed here as reference.

## III. Implementation

The initial scope of the problem was further reduced by selecting a subset of core use-cases to support in offline mode, rather than migrating the entire app's user workflows to an offline-first model. The implementation proceeded along these four concern partitions for the use-cases that were selected. (Initially, we targeted Soil Data measurements as the most critical use-case to support; its infrastructure was designed to be expanded as other subsets of the app's problem domain get offline support requirements.)

### a. Connectivity

After initial research, we decided to integrate with the `netinfo` library (https://github.com/react-native-netinfo/react-native-netinfo) to detect connectivity. The rest of the app can listen for connectivity status using React hooks which are connected to a context encapsulating the library's behavior. This status drives the enabling/disabling of relevant components as well as internal behavior that is dependent on connectivity state.

TODO(@knipec): any other details/reading/etc

### b. Persistence

Persistence is handled through a custom Redux middleware which persists the mobile client's Redux state to the app's device-backed key-value storage when state changes occur. Persisted state is loaded back into Redux when the app reopens. This seemed like the simplest solution that achieved our goals; while we investigated more heavyweight solutions involving local databases, they far exceeded our scope capacity. We elected to implement a custom middleware due to the low initial cost of implementation and a lack of actively-maintained libraries which we felt confident in adopting for such an integral piece of behavior.

TODO(@shrouxm): Handling of transient data, any other details I missed?
TODO(@knipec): Flushing data on logout?

### c. Business rules

We created 1:1 reimplementations in TypeScript of previously server-side operations, supporting them with unit tests to help ensure correctness. Redux actions which previously interacted with the server for these operations instead use the local version of the logic. Future implementation of offline support for previously online-only actions will likely follow this model.

The responsibility of these implementations is to enforce correctness on the _client side only_; as previously stated, the server is still the authority on the canonical state of Terraso LandPKS data. As a result, integrity checks in this layer of business logic primarily function to catch UI bugs (as the UI should not allow invalid actions either), rather than as a critical element of preventing data integrity or permission violations. The client must not be trusted to operate correctly. Only the server can be trusted :)

### d. Tracking and Pushing changes

There are two aspects to this problem: tracking changes on the client, and processing them on the server.

#### Revision tracking

In order to transmit accumulated local changes from client to server, the client needs to determine which data have changed. Initial implementation experiments revealed major concerns and edge-cases surrounding this problem:

- Additional changes can occur while a push operation is already in flight; an entity is not synced unless the most recent version of it is synced.
- The server's response to an out-of-date push operation must not overwrite newer client-side changes made by the user
- Push operations can fail; user data must not be lost in the event of failure and the client must be able to retry the push at a later time
- Pushed data can be rejected by the server; this is _not_ a failure, but it indicates that the client's data is in an invalid state
- To reduce data traffic, it is preferable to identify individual pieces of data which have changed rather than e.g. re-transmitting all entities from the client (as an extreme example) or re-transmitting all changed entities from the client (as a less extreme but still unacceptable example)
- It is easier to implement an automated diff computation than to accumulate a ledger of client changes, because manually implementing ledger updates for each business operation creates more surface area for business logic bugs to accumulate
- Any solution to change-tracking must have minimal consequences for the rest of the app's view of data, both to reduce implementation complexity and to reduce the cost of trying new approaches if this one proves insufficient.

A dedicated data model was created to support tracking local changes, attempting to address each of these concerns. (It can be found in the `model/sync` source directory.).

- `Revision ID`s are monotonically-increasing integer IDs scoped to each syncable entity (meaning each entity has its own `Revision ID` history). They only exist client-side; the server has no knowledge of client-specific `Revision ID`s.
- `Sync Record`s track the change state for syncable entities. The entity's `Revision ID` is incremented when the entity is changed. An entity is considered `unsynced` if its current `Revision ID` does not match the `Revision ID` of the state which was last successfully pushed to the server. Additionally, the last-known state of the entity is retained in the sync record so that a current state diff can be easily computed; the last-known sync error is also retained if the last push operation yielded an error for that entity.
  - Note that an entity is not considered synced unless the current and last-synced `Revision ID`s match exactly. This addresses the concern of changes occurring while a push is in flight.
  - Note that as long as the push operation did not **fail**, a pushed entity is considered synced even if the server reported an error for its state. That error is considered the server's final verdict about that state for the entity.
- `Sync Result`s contain server responses, and are paired with logic for merging server responses with current sync state. The server's state for any pushed entity will overwrite the current local state, unless the `Sync Result` data is for an out-of-date `Revision ID`. Out-of-date results will be discarded, with the expectation that another push operation will eventually sync the most up-to-date state.
- When a batch of new data comes for entities (such as resulting from a pull from the server), the `Sync Record` data is only retained for unsynced entities; all other entities start anew from the server's state.

The sync data model exists parallel to main entity state in Redux. Redux actions which manipulate entity state (for example, actions which modify the user's collected soil data) are expected to perform relevant bookkeeping for that entity's sync data, such as marking it as modified when it is updated or marking it as synced when a sync action succeeds.

#### Revision lifecycle

Consider soil data and sync state for site `S`. Initially, `soilData[S]` contains state `A`, which is already synced to the server; `soilSync[S]` also contains `lastSyncedData` `A` and `revisionId` `R`. We will trace the state associated with `S` through a series of application events.

Notice that, since `push` operations are idempotent, as long as we push a diff calculated from a valid synced state from the server, it is okay to `push` redundant diffs.

_Event: User Makes Local Change_

The change produces state `B`, which replaces `A` in `soilData[S]`. `soilSync[S]` retains `A` in `lastSyncedData`, but the `revisionId` is incremented to `R+1`. At this point, `S` is considered to be "unsynced".

_Event: App is Online, Push Dispatched_

The `PushDispatcher` sees that site `S` has unsynced data. The `push` action computes the diff between states `A` at revision `R` and `B` at `R+1`, and transmits this `A-B` diff to the server. It records that the server's response (when it arrives) is valid for revision `R+1`.

_Event: User Makes Another Local Change_

The change produces state `C`, which replaces `A` in `soilData[S]`. `soilSync[S]` retains `A` in `lastSyncedData`, but the `revisionId` is incremented to `R+2`. The in-flight `push` action is not affected.

_Event: Push Response_

The server response for pushing the `A-B` diff comes in. The server's state is state `Bs`. The client sees that `R+1` is not up-to-date with the current `revisionId` for site `S`, which is `R+2`; the client discards `Bs` and continues to hold state `C` for site `S`.

_Event: Second Push Dispatched_

The `PushDispatcher` sees that site `S` has unsynced data. The `push` action computes the diff between states `A` at revision `R` and `C` at `R+2`, and transmits this diff to the server as it did for `R+1`.

_Event: Second Push Response_

The server response for pushing the `A-C` diff comes in. The server's state is state `Cs`. The client sees that `R+2` is up-to-date with the current `revisionId` for site `S`, which is `R+2`; the client records that `Cs` is both the current and the last-synced state for `S`, and that `R+2` is the last-synced revision ID.

_Event: Pull With Synced Changes_

Suppose a `pull` returned state `Ps` for `S`. Since `S` is currently synced at `R+2`, the pulled state from the server `Ps` will overwrite state `B`, and the `revisionId` history for `S` will be reset.

_Alternate Event: Pull With Unsynced Changes_

Suppose `S` is at state `B` with `revisionId` `R+1`, and that a `pull` returned state `Ps` for `S`. Since `S` is currently unsynced at `R+1`, the pulled state from the server `Ps` will not overwrite state `B`, and the `revisionId` for `S` will remain `R+1`.

_Alternate Event: Push Rejected by Server_

Suppose `S` is at state `B` with `revisionId` `R+1`, and that a `push` of the diff for `A-B` at `R+1` yielded error `E`. The client records that `E` is the last-synced error for `S`, and that `R+1` is the last-synced revision; `A` is still the last-synced state since the server is still at state `A`. `S` is considered synced since the server has issued a ruling on the diff associated with `R+1`.

At this point, one of two things can occur (either is possible depending on timing):

1. Another user change could advance `S` to state `C` at revision `R+2`, which would result in the `A-C` diff being transmitted to the server; it might be accepted (which will clear `E` as the last-synced error, and record `Cs` and `R+2` as the last-synced state and `revisionId` respectively)
2. A `pull` can be dispatched to flush the invalid data; since `S` is currently synced to `R+2`, the pulled state from the server `Ps` will overwrite state `B`, the `revisionId` history for `S` will be reset, and `E` will be cleared.

#### Sending changes to server

An internal mechanism called the **Push Dispatcher** listens for app state changes and dispatches push actions when appropriate. In short:

1. When the application is online with a logged-in user,
1. And when there are entities with unsynced changes,
1. Dispatch a push action for those entities, which will result in the server recieving the combined diffs of their changes.
1. If the operation fails, begin a periodic retry cycle which will end when there is a change to the set of unsynced data (which indicates either a successful sync or new changes to push.)

TODO(@shrouxm, @knipec): embed visual diagram from mural doc?

The dispatcher sees a debounced view of online status and entity state, to that it does not attempt to e.g. rapidly queue up many push operations as the user makes several subsequent changes. See the `PushDispatcher` component for more detailed implementation documentation.

#### Processing changes on server

The server has a GraphQL endpoint that allows it to accept bundled changes from the client. Initially, one endpoint was written for the Soil Data entity domain; additional endpoints may be added for other domains. This endpoint is responsible for transactionally applying each pushed entity's changes and either reporting success or a data error for each entity. The endpoint is idempotent; transmitting the same data multiple times has no consequence for correctness. The endpoint also isolates each entity; an integrity or permissions error for one will not prevent the successful ingestion of changes for another. The server maintains an internal database log of all transmitted sync data regardless of whether it is accepted, which is intended to support solutions to potential future bugs which result in user data loss.

TODO(@shrouxm): Anything else to add that's relevant to the client?

See the `terraso-backend` repository for more details regarding GraphQL endpoint implementations.

### e. Pulling changes

#### Loading changes from server

Mirroring the push system, an internal mechanism called the **Pull Dispatcher** listens for app state changes and dispatches pull actions when appropriate. It is paired with a **Pull Requester**, which determines when it is necessary to queue a future pull.

1. If the application just started,
1. OR If the application just came online,
1. OR a push has yielded sync errors,
1. OR a periodic timer has elapsed (on the scale of every five minutes),
1. Queue a pull to occur when the dispatcher is next able to do so.

TODO(@shrouxm, @knipec): embed visual diagram from mural doc?

The dispatcher component listenes for queued pulls and, when the app is online with a logged-in user, dispatches a pull until one succeeds, and then clears the pull queue. See the `PullDispatcher` / `PullRequester` components for more detailed implementation documentation.

#### Handling changes while app is running

TODO(@knipec): screen requirements and handling background changes while viewing data

### f. Additional concern: Soil ID

Soil ID is an integral part of the Terraso LandPKS app. It uses the client's collected soil data as inputs to a core algorithm to analyze sites and their soil composition. Because these are expensive computations which need to be dynamically updated from user input, they required special consideration for offline mode operation.

Offline Soil ID was architected with the following requirements:

1. Soil ID data must be re-fetched when the inputs to a particular site change
1. Any Soil ID data loaded for the user's current soil data state must be retained when offline, even if the inputs change
1. Any changes to soil data must result in updated Soil ID matches when the user comes back online
1. Any cache of location-based matches must not grow unbounded, as they do not scale linearly with the number of sites in a user's account (which _is_ the case for data-based matches.)
1. It must be possible to reload Soil ID data for sites, even when an error occurs, without changing user inputs.
1. It is not feasible to, for example, load and cache all Soil ID data for all of the user's sites at once; it must be done on-demand based on what the user is viewing

#### Implementation

The app maintains two caches of Soil ID data in Redux: one for location-based matches, keyed by input coordinates; and another for data-based matches, keyed by relevant site ID. The data-based match cache also retains the soil data inputs which were used to generate the cached results (if any).

Individual components can request soil ID data via side-effects and the `soilIdHooks` system. This will add either a site or coordinate to a set of inputs tracked in the `SoilIdMatchContext`, and will remove them when the hook is cleaned up.

The `SoilIdMatchContext` tracks all unique inputs requested by components (correctly handling duplicates, so that e.g. two components requesting the same site will only result in one request for data.) The context then determines which inputs need to be re-loaded by examining the cache and dispatching queries for matches for any inputs which are not yet loaded or, in the case of data-based matches, inputs for which the soil data has changed since the last time matches were loaded. Any time the app goes from offline to online, the location-based match cache is flushed, along with any data-based match entries which had reported errors.

As with other components of the offline system, consult relevant source files for more detailed documentation.
