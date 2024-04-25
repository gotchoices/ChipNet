## Welcome to ChipNet

### Purpose

ChipNet is a meta-protocol library, written in Typescript, for performing path discovery within a network of nodes in which only peer connections are trusted.  This library was built to affect "lifts" in [MyChips](https://github.com/gotchoices/MyCHIPs), but may be suitable for other peer-to-peer systems.  

This is described as a meta-protocol because this library does not handle communications, state persistence, and other characteristics, but rather these are furnished by the library user.

This library provides the following capabilities:

* [Route discovery](doc/discovery.md) - performing a search for a given node identifier, either known to that node's peers, or only it itself
    * Unidirectional search - starting from a single node
    * Bidirectional search - starting from two nodes, or multiple edges of single node
* [Clustered transactions](doc/cluster.md) - clustered transactions using star or ring voting consensus
 
### Development

#### Contributing

Contributions to the ChipNet library are welcome!

Here's how you can contribute:

See [TODO](doc/todo.md) list

- **Reporting Bugs:** Open an issue describing the bug and how to reproduce it.
- **Suggesting Enhancements:** For new features or improvements, open an issue with a clear title and description.
- **Pull Requests:** For direct contributions, please make your changes in a separate fork and submit a pull request with a clear list of what you've done.


* Build: `npm run build`
	* Builds into an ES module
* Test: `npm test`
* Install Jest VSCode extension for easy test debugging
* Add .editorconfig support to VSCode or other IDE to honor conventions
