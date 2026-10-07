import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  selectCourses, selectTopCourses, selectCurrent, selectFilters, selectCoursesLoading,
  selectCoursesTotal, selectCoursesPages,
  fetchCourses, fetchCourseById, fetchTopCourses, setFilter, setPage, clearCurrent,
  hydrateCourses, setCurrent,
} from '@store/slices/courseSlice'

/** useCourses — hook for courses state + actions */
export function useCourses() {
  const dispatch = useDispatch()

  return {
    courses:    useSelector(selectCourses),
    topCourses: useSelector(selectTopCourses),
    current:    useSelector(selectCurrent),
    filters:    useSelector(selectFilters),
    loading:    useSelector(selectCoursesLoading),
    total:      useSelector(selectCoursesTotal),
    pages:      useSelector(selectCoursesPages),

    fetchAll:   (params) => dispatch(fetchCourses(params)),
    fetchById:  (id)     => dispatch(fetchCourseById(id)),
    fetchTop:   (limit)  => dispatch(fetchTopCourses(limit)),
    setFilter:  (filter) => dispatch(setFilter(filter)),
    setPage:    (page)   => dispatch(setPage(page)),
    clearCurrent: ()     => dispatch(clearCurrent()),
    hydrate:    (seed)   => dispatch(hydrateCourses(seed)),
    setCurrent: (course) => dispatch(setCurrent(course)),
  }
}

/** useCourse — auto-fetch a single course by ID.
 *  When the server already rendered the course (`initialCourse`), the store is
 *  seeded with it instead of refetching (P-F06). */
export function useCourse(id, initialCourse = null) {
  const { current, loading, fetchById, clearCurrent, setCurrent } = useCourses()

  useEffect(() => {
    if (!id) return undefined
    if (initialCourse) setCurrent(initialCourse)
    else fetchById(id)
    return () => clearCurrent()
  }, [id])

  return { course: current, loading }
}
