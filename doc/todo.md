* Time synchronization between nodes (keep as offsets) - see [Time Sync](time-sync.md)
  * Return compressed timing histogram of sub-nodes.  Use to optimize up-stream timing of level.  See [Sparstogram](https://github.com/Digithought/Sparstogram).
  * Add process and comms timing to plans
* [Logical Lock](logical-clock.md) concept for full coverage time related testing
* Many more tests
* Utilize [B+Tree](https://github.com/Digithought/Digitree) for in-memory state for scaling
* Intents
  * Intent filters for links in participants
  * Filter query intents when propagating
  * Move terms under intents
  * Don't preempt lift paths for comms paths
  * If comms path reaches target before lift, send out bi-directional probe
* Design test and implement Economics
  * Policing - Quotas & metrics
* Advertising - push out open balances to nearby neighbors - and/or probe out when expecting payment
* Do something with serialization functionality (move into own library?)
* For memory participant state, remove query details for stale queries to remove overhead for old queries
