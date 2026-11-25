const millisecondsPerHour = 60 * 60 * 1000;

export function meetsCancellationNotice(
  startsAt: Date,
  minimumNoticeHours: number,
  now: Date = new Date(),
) {
  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(now.getTime()) ||
    !Number.isInteger(minimumNoticeHours) ||
    minimumNoticeHours < 0
  ) {
    return false;
  }

  const deadline =
    startsAt.getTime() - minimumNoticeHours * millisecondsPerHour;
  return now.getTime() < startsAt.getTime() && now.getTime() <= deadline;
}
