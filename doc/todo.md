* Time synchronization between nodes (keep as offsets) - see [Time Sync](time-sync.md)
  * Return compressed timing histogram of sub-nodes.  Use to optimize up-stream timing of level.  See [Sparstogram](https://github.com/Digithought/Sparstogram).
  * Add process and comms timing to plans
* [Logical Lock](logical-clock.md) concept for full coverage time related testing
  * If budget is insufficient, don't attempt sub-query, but do report outstanding (to indicate that more time is needed) - up-stream has gone over
* Many more tests
* Utilize [B+Tree](https://github.com/Digithought/Digitree) for in-memory state for scaling
* Intents
  * Don't preempt lift paths for comms paths
  * If comms path reaches target before lift, send out bi-directional probe
  * Term satisfaction in intentsSatisfied function (make intents modular)
* Design test and implement Economics
  * Policing - Quotas & metrics
* Discovery of (not necessarily direct) peers with public addresses
* Advertising - push out open balances to nearby neighbors - and/or probe out when expecting payment
* Do something with serialization functionality (move into own library?)
* For memory participant state, remove query details for stale queries to remove overhead for old queries
