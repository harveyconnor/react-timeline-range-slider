import React from 'react'
import PropTypes from 'prop-types'
import { scaleTime } from 'd3-scale'
import { Slider, Rail, Handles, Tracks, Ticks } from 'react-compound-slider'
import {
  format,
  addHours,
  startOfToday,
  endOfToday,
  differenceInMilliseconds,
  isBefore,
  isAfter,
  set,
  addMinutes,
} from 'date-fns'

import SliderRail from './components/SliderRail'
import Track from './components/Track'
import Tick from './components/Tick'
import Handle from './components/Handle'

import './styles/index.scss'

const getTimelineConfig = (timelineStart, timelineLength) => (date) => {
  const percent = differenceInMilliseconds(date, timelineStart)/timelineLength * 100
  const value = Number(format(date, 'T'))
  return { percent, value }
}

const getFormattedBlockedIntervals = (blockedDates = [], [startTime, endTime]) => {
  if (!blockedDates.length) return null

  const timelineLength = differenceInMilliseconds(endTime, startTime)
  const getConfig = getTimelineConfig(startTime, timelineLength)

  const formattedBlockedDates = blockedDates.map((interval, index) => {
    let { start, end } = interval

    if (isBefore(start, startTime)) start = startTime
    if (isAfter(end, endTime)) end = endTime

    const source = getConfig(start)
    const target = getConfig(end)

    return { id: `blocked-track-${index}`, source, target }
  })

  return formattedBlockedDates
}

const getNowConfig = ([startTime, endTime])  => {
  const timelineLength = differenceInMilliseconds(endTime, startTime)
  const getConfig = getTimelineConfig(startTime, timelineLength)

  const source = getConfig(new Date())
  const target = getConfig(addMinutes(new Date(), 1))

  return { id: 'now-track', source, target }
}

function TimeRange(props) {
  const {
    sliderRailClassName,
    timelineInterval,
    selectedInterval,
    containerClassName,
    error,
    step,
    showNow,
    formatTick,
    mode,
    trackStyles,
    handleColors
  } = props

  const disabledIntervals = getFormattedBlockedIntervals(props.disabledIntervals, props.timelineInterval);

  const now = getNowConfig(props.timelineInterval);

  const onChange = newTime => {
    const formattedNewTime = newTime.map(t => new Date(t));
    props.onChangeCallback(formattedNewTime);
  }

  const checkIsSelectedIntervalNotValid = ([start, end], source, target) => {
    const { value: startInterval } = source;
    const { value: endInterval } = target;

    if (startInterval > start && endInterval <= end || startInterval >= start && endInterval < end) return true;
    if (start >= startInterval && end <= endInterval) return true;

    const isStartInBlockedInterval = start > startInterval && start < endInterval && end >= endInterval;
    const isEndInBlockedInterval = end < endInterval && end > startInterval && start <= startInterval;

    return isStartInBlockedInterval || isEndInBlockedInterval;
  }

  const onUpdate = newTime => {
    if (disabledIntervals?.length) {
      const isValuesNotValid = disabledIntervals.some(({ source, target }) =>
        checkIsSelectedIntervalNotValid(newTime, source, target));
      const formattedNewTime = newTime.map(t => new Date(t));
      onUpdateCallback({ error: isValuesNotValid, time: formattedNewTime });
      return;
    }

    const formattedNewTime = newTime.map(t => new Date(t));
    onUpdateCallback({ error: false, time: formattedNewTime });
  }

  const getDateTicks = () => {
    const { timelineInterval, ticksNumber } = props;
    return scaleTime().domain(timelineInterval).ticks(ticksNumber).map(t => +t);
  }

  const domain = timelineInterval.map(t => Number(t));

  return (
    <div className={containerClassName || 'react_time_range__time_range_container' }>
      <Slider
        mode={mode}
        step={step}
        domain={domain}
        onUpdate={onUpdate}
        onChange={onChange}
        values={selectedInterval.map(t => +t)}
        rootStyle={{ position: 'relative', width: '100%' }}
      >
        <Rail>
          {({ getRailProps }) =>
            <SliderRail className={sliderRailClassName} getRailProps={getRailProps} />}
        </Rail>

        <Handles>
          {({ handles, getHandleProps }) => (
            <>
              {handles.map(handle => (
                <Handle
                  error={error}
                  key={handle.id}
                  handle={handle}
                  domain={domain}
                  getHandleProps={getHandleProps}
                  styles={trackStyles}
                  errorColor={handleColors.error}
                  validColor={handleColors.valid}
                />
              ))}
            </>
          )}
        </Handles>

        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <>
              {tracks?.map(({ id, source, target }) =>
                <Track
                  error={error}
                  key={id}
                  source={source}
                  target={target}
                  getTrackProps={getTrackProps}
                  styles={trackStyles}
                />
              )}
            </>
          )}
        </Tracks>

        {disabledIntervals?.length && (
          <Tracks left={false} right={false}>
            {({ getTrackProps }) => (
              <>
                {disabledIntervals.map(({ id, source, target }) => (
                  <Track
                    key={id}
                    source={source}
                    target={target}
                    getTrackProps={getTrackProps}
                    disabled
                    styles={trackStyles}
                  />
                ))}
              </>
            )}
          </Tracks>
        )}

        {(showNow && now) && (
          <Tracks left={false} right={false}>
            {({ getTrackProps }) => (
              <Track
                key={now.id}
                source={now.source}
                target={now.target}
                getTrackProps={getTrackProps}
                styles={trackStyles}
              />
            )}
          </Tracks>
        )}

        <Ticks values={getDateTicks()}>
          {({ ticks }) => (
            <>
              {ticks.map(tick => (
                <Tick
                  key={tick.id}
                  tick={tick}
                  count={ticks.length}
                  format={formatTick}
                />
              ))}
            </>
          )}
        </Ticks>
      </Slider>
    </div>
  );
}

class TimeRangeComponent extends React.Component {
  get disabledIntervals () {
    return getFormattedBlockedIntervals(this.props.disabledIntervals, this.props.timelineInterval)
  }

  get now () {
    return getNowConfig(this.props.timelineInterval)
  }

  onChange = newTime => {
    const formattedNewTime = newTime.map(t => new Date(t))
    this.props.onChangeCallback(formattedNewTime)
  }

  checkIsSelectedIntervalNotValid = ([start, end], source, target) => {
    const { value: startInterval } = source
    const { value: endInterval } = target

    if (startInterval > start && endInterval <= end || startInterval >= start && endInterval < end)
      return true
    if (start >= startInterval && end <= endInterval) return true

    const isStartInBlockedInterval = start > startInterval && start < endInterval && end >= endInterval
    const isEndInBlockedInterval = end < endInterval && end > startInterval && start <= startInterval

    return isStartInBlockedInterval || isEndInBlockedInterval
  }

  onUpdate = newTime => {
    const { onUpdateCallback } = this.props
    const disabledIntervals = this.disabledIntervals

    if (disabledIntervals?.length) {
      const isValuesNotValid = disabledIntervals.some(({ source, target }) =>
        this.checkIsSelectedIntervalNotValid(newTime, source, target))
      const formattedNewTime = newTime.map(t => new Date(t))
      onUpdateCallback({ error: isValuesNotValid, time: formattedNewTime })
      return
    }

    const formattedNewTime = newTime.map(t => new Date(t))
    onUpdateCallback({ error: false, time: formattedNewTime })
  }

  getDateTicks = () => {
    const { timelineInterval, ticksNumber } = this.props
    return scaleTime().domain(timelineInterval).ticks(ticksNumber).map(t => +t)
  }

  render() {
    const {
      sliderRailClassName,
      timelineInterval,
      selectedInterval,
      containerClassName,
      error,
      step,
      showNow,
      formatTick,
      mode,
      trackStyles,
      handleColors
    } = this.props

    const domain = timelineInterval.map(t => Number(t))

    const disabledIntervals = this.disabledIntervals

    return (
      <div className={containerClassName || 'react_time_range__time_range_container' }>
        <Slider
          mode={mode}
          step={step}
          domain={domain}
          onUpdate={this.onUpdate}
          onChange={this.onChange}
          values={selectedInterval.map(t => +t)}
          rootStyle={{ position: 'relative', width: '100%' }}
        >
          <Rail>
            {({ getRailProps }) =>
              <SliderRail className={sliderRailClassName} getRailProps={getRailProps} />}
          </Rail>

          <Handles>
            {({ handles, getHandleProps }) => (
              <>
                {handles.map(handle => (
                  <Handle
                    error={error}
                    key={handle.id}
                    handle={handle}
                    domain={domain}
                    getHandleProps={getHandleProps}
                    styles={trackStyles}
                    errorColor={handleColors.error}
                    validColor={handleColors.valid}
                  />
                ))}
              </>
            )}
          </Handles>

          <Tracks left={false} right={false}>
            {({ tracks, getTrackProps }) => (
              <>
                {tracks?.map(({ id, source, target }) =>
                  <Track
                    error={error}
                    key={id}
                    source={source}
                    target={target}
                    getTrackProps={getTrackProps}
                    styles={trackStyles}
                  />
                )}
              </>
            )}
          </Tracks>

          {disabledIntervals?.length && (
            <Tracks left={false} right={false}>
              {({ getTrackProps }) => (
                <>
                  {disabledIntervals.map(({ id, source, target }) => (
                    <Track
                      key={id}
                      source={source}
                      target={target}
                      getTrackProps={getTrackProps}
                      disabled
                      styles={trackStyles}
                    />
                  ))}
                </>
              )}
            </Tracks>
          )}

          {showNow && (
            <Tracks left={false} right={false}>
              {({ getTrackProps }) => (
                <Track
                  key={this.now?.id}
                  source={this.now?.source}
                  target={this.now?.target}
                  getTrackProps={getTrackProps}
                  styles={trackStyles}
                />
              )}
            </Tracks>
          )}

          <Ticks values={this.getDateTicks()}>
            {({ ticks }) => (
              <>
                {ticks.map(tick => (
                  <Tick
                    key={tick.id}
                    tick={tick}
                    count={ticks.length}
                    format={formatTick}
                  />
                ))}
              </>
            )}
          </Ticks>
        </Slider>
      </div>
    )
  }
}

TimeRangeComponent.propTypes = {
  ticksNumber: PropTypes.number.isRequired,
  selectedInterval: PropTypes.arrayOf(PropTypes.object),
  timelineInterval: PropTypes.arrayOf(PropTypes.object),
  disabledIntervals: PropTypes.arrayOf(PropTypes.object),
  containerClassName: PropTypes.string,
  sliderRailClassName: PropTypes.string,
  step: PropTypes.number,
  formatTick: PropTypes.func,
  trackStyles: PropTypes.shape({
    error: PropTypes.object,
    valid: PropTypes.object,
  }),
  handleColors: PropTypes.shape({
    error: PropTypes.string,
    valid: PropTypes.string,
  }),
}

TimeRangeComponent.defaultProps = {
  selectedInterval: [
    set(new Date(), { minutes: 0, seconds: 0, milliseconds: 0 }),
    set(addHours(new Date(), 1), { minutes: 0, seconds: 0, milliseconds: 0 })
  ],
  timelineInterval: [startOfToday(), endOfToday()],
  formatTick: ms => format(new Date(ms), 'HH:mm'),
  disabledIntervals: [],
  step: 1000*60*30,
  ticksNumber: 48,
  error: false,
  mode: 3,
  trackStyles: {
    error: {
      backgroundColor: 'rgba(214,0,11,0.5)',
      borderLeft: '1px solid rgba(214,0,11,0.5)',
      borderRight: '1px solid rgba(214,0,11,0.5)',
    },
    valid: {
      backgroundColor: 'rgba(98, 203, 102, 0.5)',
      borderLeft: '1px solid #62CB66',
      borderRight: '1px solid #62CB66',
    }
  },
  handleColors: {
    error: 'rgb(214, 0, 11)',
    valid: 'rgb(98, 203, 102)'
  }
}

export { TimeRangeComponent };
export default TimeRange;
