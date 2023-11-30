# Adaptive Logical Clock

(TODO: this describes a system that doesn't exist yet)

A logical clock is based on ordering of operations rather than the real clock.  This system provides:
* registration of a sequence of event types
* capturing of logical now into a marker
* querying whether marker is before or after a given event type
* getting a callback or promise for when a given event type is reached.

This enhances testing because logical time can be moved forward manually in any manner, without slowing the actual time of the test or other non-deterministic anomalies of real-time.

For live usage, a realtime adapter advances the logical clock forward based on a policy.  This policy, for instance, contains the various relative real-time timeout values.
