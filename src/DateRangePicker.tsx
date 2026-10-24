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
          mx: 0,
          width: {
            xs: "100%",
            sm: "100%",
            md: 170,
          },
        }}
        slotProps={{
          textField: {
            variant: "outlined",
            size: "small",
          },
        }}
        defaultValue={defaultStartDate}
        value={startDate}
        onChange={setStartDate}
      />
      <DatePicker
        label="To"
        sx={{
          mx: 0,
          width: {
            xs: "100%",
            sm: "100%",
            md: 170,
          },
          mt: {
            xs: 2,
            sm: 0,
          },
        }}
        slotProps={{
          textField: {
            variant: "outlined",
            size: "small",
          },
        }}
        defaultValue={defaultEndDate}
        value={endDate}
        onChange={setEndDate}
      />
    </>
  );
}