import React, {useState} from "react"
import {Container, View, Text, List, ListItem, Left, Right, Icon} from "native-base"
import {Link} from "react-router-dom"
import {DrawerActions} from "@react-navigation/native"

const SideBar = ({descriptors, state, navigation}: any) => {
    const [icon, setIcon] = useState('arrow-forward')
    const[toggle, setToggle] = useState(false)
    let selectedRoute = state.history[state.index].key
    const expand = () => {
        if(icon === 'arrow-forward'){
            setIcon('arrow-down')
            setToggle(true)
        } else{
            setIcon('arrow-forward')
            setToggle(false)
        }
    }
    return(
        <Container>
            {state.routes.map((route: any) => (
                <>
                {descriptors[route.key].options.childern ? (
                    <>
                    <List>
                        <ListItem onPress={expand}>
                            <Left>
                                <Text>{descriptors[route.key].options.title}</Text>
                            </Left>
                            <Right>
                                <Icon name={icon}/>
                            </Right>
                        </ListItem>
                    </List>
                    {toggle && (
                        <List>
                            {descriptors[route.key].options.childern.map((subRoute: any) => (
                                <Link to={subRoute.path} style={{textDecoration: 'none'}}>
                                    <ListItem onPress={() => {
                                        console.log(subRoute)
                                        const event = navigation.emit({
                                        type: 'itemPress',
                                        target: route.key,
                                        canPreventDefault: true,
                                        });
                        
                                        if (!event.defaultPrevented) {
                                        navigation.dispatch({
                                            ...DrawerActions.jumpTo(route.name),
                                            target: state.key,
                                        });
                                        }
                                    }}>
                                        <Left>
                                            <Text>{subRoute.title}</Text>
                                        </Left>
                                        <Right>
                                            <Icon name='arrow-forward'/>
                                        </Right>
                                    </ListItem>
                                </Link>
                            ))}
                        </List>
                    )}
                    </>
                ): (
                    <List key={route.key}>
                        <ListItem
                        onPress={() => {
                            const event = navigation.emit({
                            type: 'itemPress',
                            target: route.key,
                            canPreventDefault: true,
                            });
            
                            if (!event.defaultPrevented) {
                            navigation.dispatch({
                                ...DrawerActions.jumpTo(route.name),
                                target: state.key,
                            });
                            }
                        }}
                        >
                            <Left>
                                <Text>{descriptors[route.key].options.title}</Text>
                            </Left>
                            <Right>
                                <Icon name="arrow-forward" />
                            </Right>
                        </ListItem>
                    </List>
                )}
                </>
            ))}
        </Container>
    )
}

export default SideBar