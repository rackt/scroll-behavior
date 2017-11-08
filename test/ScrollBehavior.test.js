import offset from 'dom-helpers/query/offset';
import scrollLeft from 'dom-helpers/query/scrollLeft';
import scrollTop from 'dom-helpers/query/scrollTop';
import createBrowserHistory from 'history/lib/createBrowserHistory';
import createHashHistory from 'history/lib/createHashHistory';

import { createHashHistoryWithoutKey } from './histories';
import { withRoutes, withScrollElement, withScrollElementRoutes }
  from './routes';
import run, { delay } from './run';
import withScroll from './withScroll';

describe('ScrollBehavior', () => {
  [
    createBrowserHistory,
    createHashHistory,
    createHashHistoryWithoutKey,
  ].forEach((createHistory) => {
    describe(createHistory.name, () => {
      let unlisten;

      afterEach(() => {
        if (unlisten) {
          unlisten();
        }
      });

      describe('default behavior', () => {
        it('should emulate browser scroll behavior', (done) => {
          const history = withRoutes(withScroll(createHistory()));
          const child1 = document.getElementById('child1');
          const child2 = document.getElementById('child2-id');

          unlisten = run(history, [
            () => {
              // This will be ignored, but will exercise the throttle logic.
              scrollTop(window, 10000);

              setTimeout(() => {
                scrollTop(window, 15000);
                delay(() => history.push('/detail'));
              });
            },
            () => {
              expect(scrollTop(window)).to.equal(0);
              scrollTop(window, 5000);
              delay(history.goBack);
            },
            (location) => {
              expect(location.state).to.not.exist();
              expect(scrollTop(window)).to.equal(15000);
              history.push('/detail');
            },
            () => {
              // no restore of prior state on push
              const scrollTarget = history.getSavedWindowScrollTarget();
              expect(scrollTarget).to.equal(null);
              expect(scrollTop(window)).to.equal(0);
              history.push('/detail#child2');
            },
            () => {
              expect(scrollTop(window)).to.be.closeTo(offset(child2).top, 2);
              history.push('/detail#child1');
            },
            () => {
              expect(scrollTop(window)).to.equal(offset(child1).top);
              history.push('/detail#unknown-fragment');
            },
            () => {
              expect(scrollTop(window)).to.equal(0);
              done();
            },
          ]);
        });
      });

      describe('custom behavior', () => {
        it('should allow scroll suppression', (done) => {
          const history = withRoutes(
            withScroll(
              createHistory(),
              (prevLocation, location) => (
                !prevLocation || prevLocation.pathname !== location.pathname
              ),
            ),
          );

          unlisten = run(history, [
            () => {
              history.push('/detail');
            },
            () => {
              scrollTop(window, 5000);
              delay(() => history.push('/detail?key=value'));
            },
            () => {
              expect(scrollTop(window)).to.equal(5000);
              history.push('/');
            },
            () => {
              expect(scrollTop(window)).to.equal(0);
              done();
            },
          ]);
        });

        it('should allow custom position', (done) => {
          const history = withRoutes(withScroll(
            createHistory(), () => [10, 20],
          ));

          unlisten = run(history, [
            () => {
              history.push('/detail');
            },
            () => {
              history.push('/');
            },
            () => {
              expect(scrollLeft(window)).to.equal(10);
              expect(scrollTop(window)).to.equal(20);
              done();
            },
          ]);
        });
      });

      describe('scroll element', () => {
        it('should follow browser scroll behavior', (done) => {
          const { container, ...history } = withScrollElement(
            withScroll(createHistory(), () => false),
          );

          unlisten = run(history, [
            () => {
              scrollTop(container, 10000);
              history.push('/other');
            },
            () => {
              expect(scrollTop(container)).to.equal(0);
              scrollTop(container, 5000);
              history.goBack();
            },
            () => {
              expect(scrollTop(container)).to.equal(10000);
              history.push('/other');
            },
            () => {
              expect(scrollTop(container)).to.equal(0);
              done();
            },
          ]);
        });

        it('should restore scroll on remount', (done) => {
          const { container, ...history } = withScrollElementRoutes(
            withScroll(createHistory(), () => false),
          );

          unlisten = run(history, [
            () => {
              scrollTop(container, 10000);
              history.push('/other');
            },
            () => {
              expect(container.scrollHeight).to.equal(100);
              expect(scrollTop(container)).to.equal(0);
              scrollTop(container, 5000);
              history.goBack();
            },
            () => {
              expect(container.scrollHeight).to.equal(20000);
              expect(scrollTop(container)).to.equal(10000);
              done();
            },
          ]);
        });

        it('should save element scroll position immediately', (done) => {
          const history1 = withScrollElement(
            withScroll(createHistory(), () => false),
          );

          const unlisten1 = run(history1, [
            () => {
              expect(scrollTop(history1.container)).to.equal(0);
              scrollTop(history1.container, 5000);

              delay(() => {
                unlisten1();

                const history2 = withScrollElement(
                  withScroll(
                    createHistory({ resetState: false }),
                    () => false,
                  ),
                );

                unlisten = history2.listen(() => {
                  delay(() => {
                    expect(scrollTop(history2.container)).to.equal(5000);
                    done();
                  });
                });
              });
            },
          ]);
        });
      });
    });
  });
});
