import {DatePicker} from "@mui/x-date-pickers";
import React from "react";
import {Dayjs} from "dayjs";

export default function DateRangePicker(
  {
    defaultStartDate,
    defaultEndDate,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
  }: {
    defaultStartDate?: Dayjs | null;
    defaultEndDate?: Dayjs | null;
    startDate?: Dayjs | null;
    endDate?: Dayjs | null;
    setStartDate: (startDate: Dayjs | null) => void;
    setEndDate: (endDate: Dayjs | null) => void;
  }
) {
  return (
    <>
      <DatePicker
        label="From"
        sx={{
          mx: {
            xs: 0,
            sm: 0,
            md: 1,
            lg: 1,
            xl: 1,
          },
          width: {
            xs: "100%",
            sm: "45%",
            md: "100%",
            lg: "100%",
            xl: "100%",
          },
        }}
        slotProps={{
          textField: {
            variant: "standard",
          },
        }}
        defaultValue={defaultStartDate}
        value={startDate}
        onChange={setStartDate}
      />
      <DatePicker
        label="To"
        sx={{
          mx: {
            xs: 0,
            sm: 0,
            md: 1,
            lg: 1,
            xl: 1,
          },
          width: {
            xs: "100%",
            sm: "45%",
            md: "100%",
            lg: "100%",
            xl: "100%",
          },
          mt: {
            xs: 2,
            sm: 0,
          },
        }}
        slotProps={{
          textField: {
            variant: "standard",
          },
        }}
        defaultValue={defaultEndDate}
        value={endDate}
        onChange={setEndDate}
      />
    </>
  );
}