import { Cancelled } from "saurus/deps/mutevents.ts"

import type { Help } from "saurus/src/console.ts";
import type { Saurus } from "saurus/src/saurus.ts";
import type { Server } from "saurus/src/server.ts";

export class ServerRemoteCMD {
  constructor(
    readonly plugin: RemoteCMD,
    readonly server: Server
  ) {
    const name = server.name.toLowerCase()

    plugin.servers.set(name, server)

    server.once(["close"],
      () => plugin.servers.delete(name))
  }
}

export class RemoteCMD {
  servers = new Map<string, Server>()

  server?: Server

  /**
   * Plugin that redirects commands to the given server.
   * @param saurus Your Saurus instance
   * @param server Server to redirect commands
   * @example
   * 'remote sunship give Hazae41 diamond'
   */
  constructor(
    readonly saurus: Saurus,
  ) {
    saurus.console.on(["command"],
      this.onremote.bind(this),
      this.oncommand.bind(this))

    saurus.console.on(["help"],
      this.onhelp.bind(this))
  }

  private async onhelp(help: Help) {
    if (!help.prefix) {
      help.map.set("remote", "Execute remote commands")
    }

    if (help.prefix === "remote") {
      help.map.set("remote", "Show available servers")
      help.map.set("remote <name>", "Execute remote commands on <name>")
      help.map.set("remote <name> <command>", "Execute <command> on <name>")
    }
  }

  private async onremote(command: string) {
    const [label] = command.split(" ")
    const server = this.server
    if (!server) return

    if (label === "exit") {
      delete this.server
      console.log(`No longer executing commands on ${server.name}.`)
    } else {
      const done = await server.execute(command)
      if (!done) console.log(`Unknown command. Type "help" for help.`)
    }

    throw new Cancelled("RemoteCMD")
  }

  private async oncommand(command: string) {
    const [label, ...args] = command.split(" ")
    if (label !== "remote") return;

    const [name, ...extras] = args

    if (!name) {
      console.log("Available servers:")

      for (const [name, server] of this.servers)
        console.log(name, "-", server.name)

      throw new Cancelled("RemoteCMD")
    }

    const server = this.servers.get(name)
    if (!server) throw new Error("Invalid server")

    if (extras.length) {
      const command = extras.join(" ")
      const done = await server.execute(command)
      if (!done) console.log(`Unknown command. Type "help" for help.`)
    } else {
      this.server = server;

      console.log(`Now executing commands on ${server.name}.`)
      console.log(`Type "exit" to stop executing commands.`)
    }

    throw new Cancelled("RemoteCMD")
  }
}