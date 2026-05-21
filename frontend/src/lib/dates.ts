const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}
