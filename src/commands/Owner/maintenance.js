/** @format */

const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "maintenance",
  aliases: ["maint", "mt"],
  category: "Owner",
  description: "Toggle maintenance mode",
  usage: "<on|off> [reason]",
  owner: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const action = args[0]?.toLowerCase();

    if (!action || !["on", "off"].includes(action)) {
      return message.reply(C.v2(
        C.fail(`Usage: \`${prefix}maintenance <on|off> [reason]\`\nCurrent: **${client.maintenance ? "ON" : "OFF"}**`)
      ));
    }

    if (action === "on") {
      const reason = args.slice(1).join(" ") || "Scheduled maintenance";
      client.maintenance = true;
      client.maintenanceReason = reason;

      const container = C.container(COLORS.warn)
        .addTextDisplayComponents(C.text(`### ⚠️  Maintenance Enabled`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Status** · Active\n` +
          `${e.dot} **Reason** · ${reason}\n\n` +
          `-# All commands are now restricted to bot owners.`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    client.maintenance = false;
    client.maintenanceReason = null;

    return message.reply(C.v2(
      C.ok("Maintenance mode **disabled**. All commands are now available.")
    ));
  },
};