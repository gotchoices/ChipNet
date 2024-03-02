* Time synchronization between nodes (keep as offsets) - see [Time Sync](time-sync.md)
  * Return compressed timing histogram of sub-nodes.  Use to optimize up-stream timing of level.  See [Sparstogram](https://github.com/Digithought/Sparstogram).
* [Logical Lock](logical-clock.md) concept for full coverage time related testing
* Many more tests
* Utilize [B+Tree](https://github.com/Digithought/Digitree) in memory state for scaling

* Design test and implement Economics
  * Policing - Quotas & metrics
* Advertising - push out open balances to nearby neighbors - and/or probe out when expecting payment
* Do something with serialization functionality (move into own library?)
* For memory participant state, remove query details for stale queries to remove overhead for old queries
