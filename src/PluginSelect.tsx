import React, {useEffect, useMemo, useState} from "react";
import {fetchPlugins, Plugin} from "./lib/StatsApi";
import {Autocomplete, TextField} from "@mui/material";

export default function PluginSelect({onPlugin}: {
  onPlugin?: (plugin: Plugin | null) => void;
}) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  useEffect(() => {
    fetchPlugins().then(plugins => {
      setPlugins(plugins);
    });
  }, []);

  const options = useMemo(() => plugins.map(plugin => plugin.pluginName).sort(), [plugins]);
  const pluginsByName = useMemo(() => new Map(plugins.map(plugin => [plugin.pluginName, plugin])), [plugins]);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <Autocomplete
      value={selectedOption}
      onChange={(_event: any, option: string | null) => {
        setSelectedOption(option);
        onPlugin?.(option ? (pluginsByName.get(option) ?? null) : null);
      }}
      disablePortal
      options={options}
      sx={{
        width: {
          xs: "100%",
          sm: "100%",
          md: 300,
          lg: 300,
          xl: 300,
        },
      }}
      renderInput={(params) => <TextField {...params} label="Plugin" variant="standard" />}
    />
  );
}
